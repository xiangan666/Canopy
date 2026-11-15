import { ComponentDebugDisplayElement } from './ComponentDebugDisplayElement.js';
import { EntityComponentTypes } from '@minecraft/server';

export class Ride extends ComponentDebugDisplayElement {
    constructor(entity) {
        super(entity, EntityComponentTypes.Rideable);
    }

    getFormattedData() {
        if (!this.component?.isValid) {
            this.component = this.entity.getComponent(this.componentType);
            return;
        }
        const riders = this.component.getRiders();
        const ridersText = riders.length === 0 ? '§7无' : riders.map(rider => rider?.id ?? '未知').join(', ');
        const riderFamilyTypes = this.component.getFamilyTypes();
        const riderFamilyText = riderFamilyTypes.length === 0 ? '§7无' : riderFamilyTypes.join(', ');
        return `\n§7乘客: ${ridersText}` + super.getFormattedComponent({ hide: ['interactText'] }) + `\n§7允许的生物家族: ${riderFamilyText}`;
    }
}
