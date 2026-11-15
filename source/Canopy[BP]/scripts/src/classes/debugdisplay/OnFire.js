import { ComponentDebugDisplayElement } from './ComponentDebugDisplayElement.js';
import { EntityComponentTypes } from '@minecraft/server';

export class OnFire extends ComponentDebugDisplayElement {
    constructor(entity) {
        super(entity, EntityComponentTypes.OnFire);
    }

    getFormattedData() {
        this.component = this.entity.getComponent(EntityComponentTypes.OnFire);
        let isOnFire = true;
        if (!this.component?.isValid) {
            isOnFire = false;
            return `§c${isOnFire}`;
        }
        return `§c${isOnFire}（剩余 ${this.component.onFireTicksRemaining} 刻）`;
    }
}
