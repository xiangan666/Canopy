import { DebugDisplayTextElement } from './DebugDisplayTextElement.js';

export class Effects extends DebugDisplayTextElement {
    getFormattedData() {
        const effects = this.entity.getEffects();
        let message = '';
        for (const effect of effects)
            message += `§d${effect.displayName}（${effect.duration} 刻）\n`;
        return message;
    }
}
