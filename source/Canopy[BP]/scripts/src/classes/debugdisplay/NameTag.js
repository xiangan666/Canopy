import { DebugDisplayTextElement } from './DebugDisplayTextElement.js';

export class NameTag extends DebugDisplayTextElement {
    getFormattedData() {
        const nameTag = this.entity.nameTag;
        if (!nameTag)
            return '§7无';
        return '§o§a' + nameTag;
    }
}
