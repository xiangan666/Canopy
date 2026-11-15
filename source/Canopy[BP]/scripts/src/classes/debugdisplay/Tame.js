import { DebugDisplayTextElement } from './DebugDisplayTextElement.js';
import { EntityComponentTypes } from '@minecraft/server';
import { getNameFromEntityId } from '../../../include/utils.js';

export class Tame extends DebugDisplayTextElement {
    tameable;
    tameItems;
    isTamed;

    getFormattedData() {
        this.populateComponents();
        if (this.hasIsTamedComponent())
            return this.getTamedText();
        let untamedText = `§3false`;
        if (this.hasTameableComponent())
            untamedText += this.getTameableText();
        return untamedText;
    }
    
    getTamedText() {
        let output = `§3true`;
        const tamedToPlayerId = this.isTamed?.tamedToPlayerId;
        if (tamedToPlayerId !== void 0)
            output += `§7，主人: ${getNameFromEntityId(tamedToPlayerId)}`;
        return output;
    }

    getTameableText() {
        const tameItems = this.tameable.getTameItems;
        const tameItemsText = tameItems.length === 0 ? '§7无' : tameItems.map(item => item?.typeId ?? '未知').join(', ');
        return `\n§7驯服概率: ${this.tameable.probability.toFixed(2)}，物品: ${tameItemsText}`;
    }

    populateComponents() {
        this.tameable = this.entity.getComponent(EntityComponentTypes.Tameable);
        this.isTamed = this.entity.getComponent(EntityComponentTypes.IsTamed);
        if (this.tameable)
            this.tameItems = this.tameable.getTameItems;
    }

    hasIsTamedComponent() {
        return this.isTamed?.isValid;
    }

    hasTameableComponent() {
        return this.tameable?.isValid;
    }
}
