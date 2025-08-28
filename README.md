# SDStore Bot

A Telegram bot for managing product keys, discounts, and user support. Built with Node.js and uses JSON or a database for storage.

---

## Features

- Send product keys to users securely.
- Apply discounts to products with percentage calculation.
- Supports multi-word product names.
- Admin-only commands with authentication.
- User support: users can send messages or images to admin.
- Handles Markdown special characters safely.

---

## Folder Structure

```
sdstore-bot/
├─ bot.js # Main bot logic
├─ data/
│ └─ products.json # Product list with originalPrice and discount
├─ package.json
├─ .env # Environment variables
└─ README.md

```
## Installation

1. Clone the repository:

```
git clone https://github.com/yourusername/sdstore-bot.git
cd sdstore-bot

```

2. Install dependencies:
```
npm install
```
3. Create ```.env``` file in the root directory:
```
BOT_TOKEN=your_telegram_bot_token
ADMIN_ID=your_telegram_id
```
4. Prepare the product data:
```
[
  { "id": 1, "name": "Windows 11 Pro", "price": 100, "originalPrice": 100, "discount": 0 },
  { "id": 2, "name": "GameKey1", "price": 50, "originalPrice": 50, "discount": 0 }
]

```
save as ```./data/products.json```

## Dependencies
 - node-telegram-bot-api
 - dotenv
 - fs (built-in)

## Contributing

 1. Fork the repository.

 2. Create a new branch: git checkout -b feature-name

 3. Make your changes.

 4. Submit a pull request.

  Only the admin can modify bot behavior or product prices.

## License

All rights reserved. No part of this repository may be reproduced, distributed, or modified without explicit permission from the author.

## Support / Contact

Contact the admin for issues or questions via Telegram: [Ouk_Longdy](https://t.me/Ouk_Longdy)

## Known Issues / To-do

- Improve support for multiple admins.
- Add database integration (Supabase or PostgreSQL) for persistent storage.
- Add more detailed logging for errors and admin actions.
- Enhance user support workflow with inline buttons.
