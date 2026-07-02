# Telegram Location Restaurant Bot

This project is a Telegram bot that helps users find nearby restaurants based on their current location. Users can share their live location with the bot, and it will respond with a list of the five closest restaurants.

## Features

- Users can share their live location.
- The bot retrieves and displays the five nearest restaurants.
- Error handling middleware to manage any issues during operation.

## Project Structure

```
telegram-location-restaurant-bot
├── src
│   ├── app.ts                     # Entry point of the application
│   ├── bot
│   │   ├── index.ts               # Main bot instance and handler initialization
│   │   ├── handlers
│   │   │   ├── location.handler.ts # Handles incoming location messages
│   │   │   └── start.handler.ts    # Handles the start command
│   │   ├── keyboards
│   │   │   └── main.keyboard.ts     # Main keyboard layout for user interaction
│   │   └── middlewares
│   │       └── error.middleware.ts  # Error handling middleware
│   ├── config
│   │   └── index.ts                # Configuration settings for the bot
│   ├── services
│   │   ├── restaurant.service.ts    # Service for fetching restaurant data
│   │   └── location.service.ts      # Service for processing location data
│   ├── types
│   │   └── index.ts                # TypeScript interfaces and types
│   └── utils
│       └── distance.util.ts        # Utility functions for distance calculations
├── package.json                    # npm configuration file
├── tsconfig.json                   # TypeScript configuration file
└── README.md                       # Project documentation
```

## Setup Instructions

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd telegram-location-restaurant-bot
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create `.env` file in project root:
   ```
   BOT_TOKEN=your_telegram_bot_token
   API_BASE_URL=http://localhost:8000/api
   NEARBY_RADIUS_KM=50
   NEARBY_LIMIT=5
   USE_WEBHOOK=false
   WEBHOOK_DOMAIN=https://your-domain.com
   WEBHOOK_PATH=/telegram/webhook
   PORT=3000
   ```

5. Run the bot:
   ```
   npm start
   ```

## Webhook (Production)

1. Set these values in production `.env`:
   ```
   USE_WEBHOOK=true
   WEBHOOK_DOMAIN=https://your-domain.com
   WEBHOOK_PATH=/telegram/webhook
   PORT=3000
   ```

2. Start bot process (PM2/systemd/Docker):
   ```
   npm run build
   node dist/app.js
   ```

3. Verify webhook from Telegram API:
   ```
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
   ```

## Usage

- Start a chat with the bot on Telegram.
- Send the `/start` command to receive a welcome message and instructions.
- Share your live location with the bot to receive a list of the five nearest restaurants.

## API Requirement

Backend should provide this endpoint:

- `GET /api/restaurants/nearby?lat=<latitude>&lng=<longitude>&radius=<km>`

Your `restoran-sayt` project already has this route in `routes/api.php`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.