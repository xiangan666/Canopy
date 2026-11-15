import { Entity } from "@minecraft/server";
import { DebugDisplayTextElement } from "./DebugDisplayTextElement";
import { getNameFromEntityId } from "../../../include/utils";

const componentPropertyNames = Object.freeze({
    canBeSiphonedFrom: '可被抽取', canBeSiphonedTo: '可向其输入', currentAirSupply: '当前空气值',
    currentValue: '当前值', defaultValue: '默认值', effectiveMax: '最大有效值',
    effectiveMin: '最小有效值', fallDistance: '坠落距离', fallTime: '坠落时间',
    isJumping: '正在跳跃', maxAirSupply: '最大空气值', max: '最大值', min: '最小值',
    movementSpeed: '移动速度', name: '名称', onFireTicksRemaining: '着火剩余刻数',
    value: '数值', valueRange: '数值范围', velocity: '速度向量',
    interactText: '交互提示', allowedFamilies: '允许的生物家族',
    entityTypes: '实体类型', families: '生物家族',
});

export class ComponentDebugDisplayElement extends DebugDisplayTextElement {
    commonIrrelevantProperties = ['componentId', 'entity', 'typeId', 'isValid'];
    relevantProperties = [];

    constructor(entity, componentType) {
        super(entity);
        this.component = entity.getComponent(componentType);
        this.componentType = componentType;
        this.populateRelevantProperties();
    }

    populateRelevantProperties() {
        const props = new Set();
        let obj = this.component;
        while (obj && obj !== Object.prototype) {
            Object.getOwnPropertyNames(obj).forEach(p => {
                if (typeof this.component[p] !== 'function')
                    props.add(p);
            });
            obj = Object.getPrototypeOf(obj);
        }
        this.relevantProperties = Array.from(props);
        this.commonIrrelevantProperties.forEach(property => {
            const index = this.relevantProperties.indexOf(property);
            if (index !== -1)
                this.relevantProperties.splice(index, 1);
        });
    }

    getFormattedComponent({ hide = [], noLinebreak = false, valueColorCode = '§7' } = {}) {
        this.component = this.entity.getComponent(this.componentType);
        const componentData = {};
        this.relevantProperties.forEach(prop => {
            if (hide.includes(prop))
                delete componentData[prop];
            else if (this.component[prop] instanceof Entity)
                componentData[prop] = this.component[prop] ? (getNameFromEntityId(this.component[prop].id) ?? '未知') : '无';
            else if (typeof this.component[prop] === 'boolean')
                componentData[prop] = this.component[prop] ? '是' : '否';
            else
                componentData[prop] = this.component[prop] === void 0 ? '无' : this.component[prop];
        });
        if (noLinebreak)
           return Object.keys(componentData).map((prop) => `§7${componentPropertyNames[prop] ?? prop}: ${valueColorCode}${componentData[prop]}`).join('§r '); 
        return '\n' + Object.keys(componentData).map((prop) => `§7${componentPropertyNames[prop] ?? prop}: ${valueColorCode}${componentData[prop]}`).join('§r\n');
    }
}
