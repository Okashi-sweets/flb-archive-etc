import { sendInteractionResponse, ephemeral } from "../ts_component/interactions.ts";

export const data = {
    name: "ping",
    description: "Replies with Pong!",
};

export async function execute(interaction: Record<string, unknown>) {
    await sendInteractionResponse(
        interaction.id as string,
        interaction.token as string,
        ephemeral("Pong!")
    );
}