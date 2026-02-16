export const dynamic = "force-dynamic";

import { getBotConfig } from "@/actions/bot";
import { BotConfigForm } from "./bot-config-form";

export default async function BotConfigPage() {
  const config = await getBotConfig();

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-xl tracking-wider text-foreground">
        Bot <span className="text-primary">Config</span>
      </h1>

      <BotConfigForm config={config} />
    </div>
  );
}
