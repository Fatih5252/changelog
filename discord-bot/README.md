# The Changelog API Bot

This bot was created for the **official Changelog Discord server**.  
It currently performs two main tasks:  

1. **Instatus Integration** – Works with [Instatus](https://status.scootkit.com) to automatically post status updates into a Discord channel.  
2. **GitHub Webhooks** – Listens for GitHub push events via webhooks and sends formatted notifications to a specific Discord channel.  

---

## Important Notes

- The entire source code and this documentation are **written in German**.  
- If you want to use the bot in another language, you will have to **translate all text, output, and messages yourself**.  
- There is **no official support** – if you run into issues, you are expected to solve them **on your own**.  

A basic understanding of **JavaScript** and **Node.js** is required.  
If you don’t know how to install packages or configure environment variables, you should learn these basics first.

---

## install packages

Install all the packages with `npm i` or `yarn`

## Installation
1. Clone the files from the `discord-bot` folder
2. Update all necessary information and settings (e.g., Discord channel ID, tokens, signatures, command IDs, etc.).

---
## What you can expect after you run the code
a `last_status.json` file is going to be created and it can look like this:
```json
{"pageStatus":"UP","incidents":"[]","maintenances":"[]"}
```

a `status_channels.json` file is going to be created and it contains all server id's and their channel ids where the bot is allowed to send status updates.

this is normal because the bot checks this file if any incidents happen. if yes the bot will send a new message to the channel. if no. itdoes nothing and will send a message to the console.