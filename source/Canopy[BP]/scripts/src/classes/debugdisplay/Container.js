import { ComponentDebugDisplayElement } from './ComponentDebugDisplayElement.js';
import { EntityComponentTypes } from '@minecraft/server';

export class Container extends ComponentDebugDisplayElement {
    constructor(entity) {
        super(entity, EntityComponentTypes.Inventory);
    }

    getFormattedData() {
        if (!this.component?.isValid) {
            this.component = this.entity.getComponent(this.componentType);
            return;
        }
        const container = this.component.container;
        let message = `§7可被抽取: §3${this.component.canBeSiphonedFrom}`;
        message += `\n§7已填充槽位: ${container.size - container.emptySlotsCount}/${container.size}，重量: ${container.weight}`;
        return message;
    }
}
