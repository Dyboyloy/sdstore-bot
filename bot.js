const TelegramBot = require('node-telegram-bot-api');
const products = require('./data/products.json');
const fs = require('fs');
const supabase = require('./supabase');
const https = require('https');
require('dotenv').config();

const token = process.env.BOT_TOKEN;
const adminId = process.env.ADMIN_ID;
const FILE_PATH = './data/qr.jpg';

const bot = new TelegramBot(token, { polling: true });

// Simple server to keep the bot alive on platforms like Render
https.createServer((req, res) => res.end('SD Store Bot is running')).listen(process.env.PORT || 3000);

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(chatId, "👋 Welcome Admin! Use /products to view products or /support to manage support requests.");
        return;
    }
    try {
        const { error } = await supabase
            .from('users')
            .upsert({ id: userId, username: msg.from.username, chat_id: chatId }, { onConflict: 'id' });

        if (error) throw error;

        const firstName = msg.from.first_name || 'there';

        const welcomeMessage = `Hello, ${firstName}! 👋 Welcome to SD Store!

        💻 Your trusted shop for digital software keys.
        ✅ Windows 10 & 11 (OEM & Retail)
        ✅ Microsoft Office 2021 Keys
        🎁 Free Tech Support for activation

        🛒 Browse products: /products
        📩 Contact admin/support: /support

        ⚡ Tip: First 10 customers get 30% OFF on Windows keys! Grab yours now!`;
        bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    } catch (err) {
        console.error('Error upserting user:', err);
    }
});

// Handle /products command
bot.onText(/\/products/, (msg) => {
    const chatId = msg.chat.id;

    let productsMessage = "🛒 *Available Products – SD Store*\n\n";

    products.forEach((product, index) => {
        productsMessage += `${index + 1}. *${product.name}*\n` +
                            `💡 ${product.description}\n` +
                            `💰 Orginal Price: $${product.original_price}\n` +
                            `💥 Discount: ${product.discount ? product.discount + '%' : '0%'}\n` +
                            `💰 Price: $${product.price}\n` +
                            `✅ Type: ${product.type}\n` +
                            `🎁 Free Tech Support\n` +
                            `To buy: /buy ${product.name}\n\n`;
    });

    bot.sendMessage(chatId, productsMessage, { parse_mode: 'Markdown' });
});

// Handle /buy command
bot.onText(/\/buy (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const productName = match[1].trim();

    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());

    if (product) {
        const purchaseMessage = `🛒 *Purchase Instructions for ${product.name}*\n\n` +
                                `1. Send $${product.price} to our payment method (details will be provided upon request).\n` +
                                `2. After payment, send a message to our admin/support: /support with your payment proof.\n` +
                                `3. Once verified, you will receive your product key and free tech support for activation.\n\n` +
                                `Thank you for choosing SD Store! 🎉`;

         // Send static QR code with instructions
        bot.sendPhoto(chatId, fs.createReadStream(FILE_PATH), { caption: purchaseMessage, parse_mode: 'Markdown' });

        // Forward order details to admin
        bot.sendMessage(adminId, `📩 New Order!\nCustomer: ${msg.from.first_name} (@${msg.from.username})\nCustomer ChatID: ${chatId}\nProduct: ${product.name}\nPrice: $${product.price}`);
    } else {
        bot.sendMessage(chatId, "❌ Product not found. Please check the product name and try again.");
    }
});

// Handle /support command
bot.onText(/\/support (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;

    if (msg.chat.id.toString() === adminId) {
        bot.sendMessage(chatId, "👋 Admin, to respond to a user, use the command:\n/send <username> <message>\n\nTo send a product key, use:\n/sendKey <username> <product_key>");
        return;
    }

    const supportMessage = match[1].trim();
    if (!supportMessage) {
        bot.sendMessage(chatId, "❌ Please provide a message to send to the admin/support. Usage: /support <your_message>");
        return;
    }

    const userInfo = `👤 User Info:\nName: ${msg.from.first_name} ${msg.from.last_name || ''}\nUsername: @${msg.from.username || 'N/A'}\nChatID: ${chatId}\n\nMessage:\n${supportMessage}`
    await bot.sendMessage(chatId, "✅ Your message has been sent to the admin/support. They will get back to you shortly.");
    bot.sendMessage(adminId, userInfo);
});

// Handle /sendKey command for admin to send product keys
bot.onText(/\/sendKey (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
        return;
    }

    const args = match[1].split(' ');
    if (args.length < 2) {
        bot.sendMessage(adminId, "❌ Usage: /send <username> <product_key>");
        return;
    }

    const username = args[0].replace('@', '').toLowerCase();
    const productKey = args.slice(1).join(' ');

    try {
        const { data, error } = await supabase
            .from('users')
            .select('chat_id')
            .eq('username', username)
            .single();

        if (error) throw error;

        if (!data) {
            return bot.sendMessage(adminId, "❌ User not found in database.");
        }

        const targetChatId = data.chat_id;
        await bot.sendMessage(targetChatId, `🎉 Here is your product key: \n\n*${productKey}*\n\nIf you need any assistance with activation, feel free to reach out! with /support`, { parse_mode: 'Markdown' });
        bot.sendMessage(adminId, `✅ Product key sent to @${username}.`);
    } catch (err) {
        console.error('Error fetching user from database:', err);
        return bot.sendMessage(adminId, "❌ An error occurred while fetching the user from the database.");
    }
});

// Handle /send command for admin to send messages
bot.onText(/\/send (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
        return;
    }

    const args = match[1].split(' ');
    if (args.length < 2) {
        bot.sendMessage(adminId, "❌ Usage: /send <username> <message>");
        return;
    }

    const username = args[0].replace('@', '').toLowerCase();
    const message = args.slice(1).join(' ');

    try {
        const { data, error } = await supabase
            .from('users')
            .select('chat_id')
            .eq('username', username)
            .single();

        if (error) throw error;

        if (!data) {
            return bot.sendMessage(adminId, "❌ User not found in database.");
        }

        const targetChatId = data.chat_id;
        await bot.sendMessage(targetChatId, `📩 Message from Admin:\n\n${message}`);
        bot.sendMessage(adminId, `✅ Message sent to @${username}.`);
    } catch (err) {
        console.error('Error fetching user from database:', err);
        return bot.sendMessage(adminId, "❌ An error occurred while fetching the user from the database.");
    }
});

// Handle photo messages from users to admin
bot.on('photo', async (msg) => {
    const userId = msg.from.id;
    const username = msg.from.username || 'Unknown';

    if (!msg.photo) return;

    const photoArray = msg.photo;
    const photoFileId = photoArray[photoArray.length - 1].file_id; // highest quality
    const caption = msg.caption || '';

    // Forward photo to admin
    await bot.sendPhoto(adminId, photoFileId, { caption: `Payment proof from @${username}:\n${caption}` });

    // Confirm to user
    bot.sendMessage(msg.chat.id, "✅ Your payment proof has been sent to admin.");
});

// Handle /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `🆘 *Help - SD Store Bot*\n\n` +
                        `/start - Start interaction with the bot\n` +
                        `/products - View available products\n` +
                        `/buy <product_name> - Get purchase instructions for a product\n` +
                        `/support <your_message> - Contact admin/support\n\n` +
                        `*Admin Commands:*\n` +
                        `/send <username> <message> - Send a message to a user\n` +
                        `/sendKey <username> <product_key> - Send a product key to a user\n` +
                        `/add <name> | <description> | <price> | <type> - Add a new product\n` +
                        `/discount <product_name> <percentage> - Apply discount to a product\n\n`+
                        `If you need further assistance, feel free to reach out!`;
    bot.sendMessage(chatId, helpMessage, { parse_mode: undefined });
});

// Handle /info command to get bot info
bot.onText(/\/info/, (msg) => {
    const chatId = msg.chat.id;
    const infoMessage = `ℹ️ *SD Store Bot Information*\n\n` +
                        `Version: 1.0.1\n` +
                        `Developer: Longdy\n` +
                        `Contact: @Ouk_Longdy\n\n` +
                        `This bot helps manage product sales and support for SD Store.`;
    bot.sendMessage(chatId, infoMessage);
});

//Handle /add command to add new products (admin only)
bot.onText(/\/add (.+)/, (msg, match) => {
    if (msg.chat.id.toString() !== adminId) {
        bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
        return;
    }
    const productData = match[1].split('|').map(item => item.trim());
    if (productData.length !== 4) {
        bot.sendMessage(adminId, "❌ Usage: /add <name> | <description> | <price> | <type>");
        return;
    }
    const [name, description, price, type] = productData;
    const newProduct = { name, description, price: parseFloat(price), type };
    products.push(newProduct);
    fs.writeFileSync('./data/products.json', JSON.stringify(products, null, 2));
    bot.sendMessage(adminId, `✅ Product "${name}" added successfully.`);
});

// Handle /discount command to apply discount (admin only)
bot.onText(/\/discount\s+"(.+)"\s+(\d+)/, (msg, match) => {
    if (msg.chat.id.toString() !== adminId) {
        return bot.sendMessage(msg.chat.id, "❌ You are not authorized to use this command.");
    }

    const productName = match[1].trim();
    const percentage = parseFloat(match[2]);

    if (isNaN(percentage) || percentage <= 0 || percentage >= 100) {
        return bot.sendMessage(adminId, "❌ Please provide a valid discount percentage (0-100).");
    }

    const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
    if (!product) return bot.sendMessage(adminId, "❌ Product not found.");

    // Use originalPrice or fallback
    const originalPrice = product.original_price ?? product.price;
    product.original_price = originalPrice;

    // Stop repeated discounts
    if (product.discount === percentage) {
        return bot.sendMessage(adminId, `⚠️ Discount of ${percentage}% is already applied to "${product.name}".`);
    }

    // Apply new discount
    const discountAmount = (originalPrice * percentage) / 100;
    product.price = parseFloat((originalPrice - discountAmount).toFixed(2));
    product.discount = percentage;

    fs.writeFileSync('./data/products.json', JSON.stringify(products, null, 2));

    bot.sendMessage(adminId, `✅ Discount of ${percentage}% applied to "${product.name}". New price: $${product.price}`);
});

// Handle unknown commands
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // Ignore commands that are already handled
    if (text.startsWith('/start') || text.startsWith('/products') || text.startsWith('/buy') || text.startsWith('/support') || text.startsWith('/send') || text.startsWith('/sendKey') || text.startsWith('/help') || text.startsWith('/info') || text.startsWith('/add') || text.startsWith('/discount')) {
        return;
    }

    // Ignore non-command messages (like photos, stickers, etc.)
    if (!text.startsWith('/')) {
        return;
    }

    bot.sendMessage(chatId, "❌ Unknown command. Please use /products to view available products or /support to contact admin.");
});

// Handle errors
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

bot.on("polling_error", (err) => console.error("Polling error:", err));
bot.on("webhook_error", (err) => console.error("Webhook error:", err));


// Log bot start
console.log('Bot is running...');