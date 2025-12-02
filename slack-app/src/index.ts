import { App } from "@slack/bolt";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// In-memory storage for user settings (use a database in production)
interface UserSettings {
  channels: string[];
}

const userSettingsStore: Map<string, UserSettings> = new Map();

// Debug: Log all incoming events
app.use(async (args) => {
  console.log("📥 Received:", args.payload?.type || args.body?.type || "unknown");
  await args.next();
});

// Home Tab View
app.event("app_home_opened", async ({ event, client }) => {
  console.log("🏠 app_home_opened event received for user:", event.user);
  
  try {
    const result = await client.views.publish({
      user_id: event.user,
      view: {
        type: "home",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Welcome to your Superhuman FM!* 🎉"
            }
          },
          {
            type: "divider"
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "⚙️ Settings",
                  emoji: true
                },
                action_id: "open_settings_modal"
              }
            ]
          },
          {
            type: "divider"
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "🎙️ Send Podcast to Me",
                  emoji: true
                },
                action_id: "send_podcast_to_me",
                style: "primary"
              }
            ]
          }
        ]
      }
    });
    console.log("✅ Home view published successfully:", result.ok);
  } catch (error) {
    console.error("❌ Error publishing home view:", error);
  }
});

// Handle Settings button click - open modal
app.action("open_settings_modal", async ({ ack, body, client }) => {
  await ack();
  console.log("⚙️ Settings button clicked");

  const userId = (body as any).user.id;

  try {
    // Fetch channels the user is a member of
    const channelsResponse = await client.users.conversations({
      user: userId,
      types: "public_channel,private_channel",
      exclude_archived: true,
      limit: 100
    });

    // Filter channels starting with "all-" and get their IDs
    const allChannels = channelsResponse.channels || [];
    const preselectedChannels = allChannels
      .filter(channel => channel.name?.startsWith("all-"))
      .map(channel => channel.id!)
      .slice(0, 10); // Max 10

    console.log(`📋 Found ${allChannels.length} channels, preselecting ${preselectedChannels.length} "all-*" channels`);

    // Use existing settings if available, otherwise use preselected "all-*" channels
    const existingSettings = userSettingsStore.get(userId);
    const initialChannels = existingSettings?.channels || preselectedChannels;

    // Build the channel select element with initial values if any
    const channelSelectElement: any = {
      type: "multi_conversations_select",
      action_id: "selected_channels",
      placeholder: {
        type: "plain_text",
        text: "Select channels..."
      },
      filter: {
        include: ["public", "private"],
        exclude_bot_users: true
      },
      max_selected_items: 10
    };

    // Add initial_conversations only if we have channels to preselect
    if (initialChannels.length > 0) {
      channelSelectElement.initial_conversations = initialChannels;
    }

    await client.views.open({
      trigger_id: (body as any).trigger_id,
      view: {
        type: "modal",
        callback_id: "settings_modal_submit",
        title: {
          type: "plain_text",
          text: "Settings"
        },
        submit: {
          type: "plain_text",
          text: "Save"
        },
        close: {
          type: "plain_text",
          text: "Cancel"
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Configure your preferences*"
            }
          },
          {
            type: "divider"
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*📢 Channels*\nSelect channels to monitor (up to 10)"
            }
          },
          {
            type: "input",
            block_id: "channels_input",
            element: channelSelectElement,
            label: {
              type: "plain_text",
              text: "Channels"
            }
          }
        ]
      }
    });
    console.log("✅ Settings modal opened");
  } catch (error) {
    console.error("❌ Error opening settings modal:", error);
  }
});

// Handle "Send Podcast to Me" button click
app.action("send_podcast_to_me", async ({ ack, body, client }) => {
  await ack();
  console.log("🎙️ Send Podcast to Me button clicked");

  const userId = (body as any).user.id;
  const userSettings = userSettingsStore.get(userId);
  const selectedChannels = userSettings?.channels || [];

  try {
    // Get channel names for the message
    let channelNames: string[] = [];
    for (const channelId of selectedChannels) {
      try {
        const info = await client.conversations.info({ channel: channelId });
        if (info.channel && 'name' in info.channel) {
          channelNames.push(`#${info.channel.name}`);
        }
      } catch {
        channelNames.push(`<#${channelId}>`);
      }
    }

    // Send test message to the Messages tab (DM with the app)
    await client.chat.postMessage({
      channel: userId,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎙️ Superhuman FM - Your Daily Podcast",
            emoji: true
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Hey <@${userId}>! Here's your personalized podcast summary.`
          }
        },
        {
          type: "divider"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*📢 Monitoring ${channelNames.length} channel(s):*\n${channelNames.length > 0 ? channelNames.join(", ") : "_No channels selected yet. Update your settings!_"}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🔊 *Test Audio Message*\nThis is a placeholder for your generated podcast. The full feature will include AI-generated audio summaries of your selected channels!"
          }
        },
        {
          type: "divider"
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `📅 Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`
            }
          ]
        }
      ],
      text: "🎙️ Your Superhuman FM podcast is ready!" // Fallback text
    });
    
    console.log("✅ Test podcast message sent to user:", userId);
  } catch (error) {
    console.error("❌ Error sending podcast message:", error);
  }
});

// Handle modal submission
app.view("settings_modal_submit", async ({ ack, body, view, client }) => {
  await ack();
  console.log("📝 Settings modal submitted");
  
  const userId = body.user.id;
  const values = view.state.values;
  
  // Extract selected values
  const selectedChannels = values.channels_input?.selected_channels?.selected_conversations || [];
  
  // Store user settings
  const settings: UserSettings = {
    channels: selectedChannels,
  };
  userSettingsStore.set(userId, settings);
  
  console.log(`✅ Settings saved for user ${userId}:`, settings);
  
  // Get channel names for the confirmation message
  let channelNames: string[] = [];
  try {
    for (const channelId of selectedChannels) {
      const info = await client.conversations.info({ channel: channelId });
      if (info.channel && 'name' in info.channel) {
        channelNames.push(`#${info.channel.name}`);
      }
    }
  } catch (error) {
    console.error("Error fetching channel names:", error);
    channelNames = selectedChannels.map(id => `<#${id}>`);
  }
  
  // Send confirmation message to the user
  try {
    await client.chat.postMessage({
      channel: userId,
      text: `✅ *Settings saved!*\n\n` +
            `📢 *Channels:* ${channelNames.length > 0 ? channelNames.join(", ") : "None selected"}`
    });
  } catch (error) {
    console.error("❌ Error sending confirmation:", error);
  }
});

// Helper function to get user settings (for use in other parts of the app)
export function getUserSettings(userId: string): UserSettings | undefined {
  return userSettingsStore.get(userId);
}

// Handle errors
app.error(async (error) => {
  console.error("❌ App error:", error);
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ Slack TypeScript app is running!");
  console.log("🔌 Socket Mode: Connected and listening for events...");
})();
