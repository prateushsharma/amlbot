import {db} from "./db";
import { checkWallet} from "./check";
import {bot} from "./bot";

export function startTrackingWorker() {
    setInterval(() => {
        const tracked = db.prepare(`
            SELECT
            ta.id as tarcked_id,
            ta.chain,
            ta.address,
            ta.last_seen_cursor,
            u.telegram_user_id
            FROM tracked_addresses ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.is_active = 1
        `).all();

        for (const row of tracked) {
            processTrackedAddress(row);
        }
    } , 5 *60 * 1000);}

async function processTrackedAddress(row: any) {
    const result = await checkWallet({
        chain: row.chain,
        address: row.address,
    });

    // alert on HIGH risk
    if (result.riskLevel !== "High")  return;

    const exists = db.prepare(`
        SELECT 1 FROM alert_events
        WHERE tracked_address_id = ?
        AND chain = ?`)


}