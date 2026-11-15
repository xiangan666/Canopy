import { ComponentDebugDisplayElement } from './ComponentDebugDisplayElement.js';

export class AttributeDebugDisplayElement extends ComponentDebugDisplayElement {
    constructor(entity, componentType, valueColorCode) {
        super(entity, componentType);
        this.valueColorCode = valueColorCode || '';
    }

    getFormattedData() {
        if (!this.component?.isValid) {
            this.component = this.entity.getComponent(this.componentType);
            return;
        }
        return `§7${this.valueColorCode}${this.component.currentValue}/${this.component.defaultValue} §7（有效范围: ${this.component.effectiveMin} 至 ${this.component.effectiveMax}）`;
    }
}
