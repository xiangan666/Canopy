import { world } from '@minecraft/server';
import { broadcastActionBar } from "../include/utils";
import { LegacyInventoryMigrator } from "./classes/simplayer/LegacyInventoryMigrator";
import Understudies from "./classes/simplayer/Understudies";
import { startWorldSystems } from "./onWorldStartup";

world.afterEvents.worldLoad.subscribe(async () => {
    await LegacyInventoryMigrator.migrate();
    const players = world.getAllPlayers();
    if (players[0]?.isValid) {
        broadcastActionBar('§a行为包已重新加载。');
        Understudies.adoptExisting();
        startWorldSystems();
    }
});
