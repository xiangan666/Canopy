import { DebugDisplayTextElement } from './DebugDisplayTextElement.js';
import { tntFuseRule } from '../../rules/tntFuse.js';

export class TNT extends DebugDisplayTextElement {
    totalFuseTicks;

    getFormattedData() {
        if (!this.totalFuseTicks)
            this.totalFuseTicks = tntFuseRule.getGlobalFuseTicks();
        const fuseTicks = this.entity.getDynamicProperty('fuseTicks');
        return `§c${fuseTicks}§7/${this.totalFuseTicks} 刻`;
    }
}
