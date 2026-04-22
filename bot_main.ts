import {

  CommandClient,
  Command,
  CommandContext,
  GatewayIntents
} from 'https://deno.land/x/harmony/mod.ts'

import checkreceurl from "./ts_component/racecheck.ts"

const client = new CommandClient({
  prefix: '!',
  intents: [
    'GUILDS',
    'DIRECT_MESSAGES',
    'GUILD_MESSAGES'
  ],
})

client.on('ready', () => {
  console.log("bot is ready")
})

// Create a new Command
class PingCommand extends Command {
  name = 'ping'

  execute(ctx: CommandContext) {
    ctx.message.reply(`pong! Ping: ${ctx.client.gateway.ping}ms`)
  }
}

class checkurl extends Command{
  name = 'url'
  execute(ctx: CommandContext){
      const url = ctx.argStrings[0]
  checkraceurl(url)
}}

client.commands.add(PingCommand)

// Connect to gateway
client.connect()