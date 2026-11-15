import { system, world } from '@minecraft/server';
import { DebugDisplayTextDrawer } from './DebugDisplayTextDrawer';
import { DebugDisplayTextElement } from './DebugDisplayTextElement';
import { DebugDisplayShapeElement } from './DebugDisplayShapeElement';

import { Location } from './Location';
import { HeadLocation } from './HeadLocation';
import { Speed } from './Speed';
import { ID } from './ID';
import { Velocity } from './Velocity';
import { Rotation } from './Rotation';
import { IsClimbing } from './IsClimbing';
import { IsFalling } from './IsFalling';
import { IsInWater } from './IsInWater';
import { IsOnGround } from './IsOnGround';
import { IsSleeping } from './IsSleeping';
import { IsSneaking } from './IsSneaking';
import { IsSprinting } from './IsSprinting';
import { IsSwimming } from './IsSwimming';
import { IsValid } from './IsValid';
import { Effects } from './Effects';
import { NameTag } from './NameTag';
import { Target } from './Target';
import { TypeID } from './TypeID';
import { ViewDirection } from './ViewDirection';
import { Health } from './Health';
import { Age } from './Age';
import { GrowUp } from './GrowUp';
import { Breath } from './Breath';
import { Equipment } from './Equipment';
import { Exhaustion } from './Exhaustion';
import { FlySpeed } from './FlySpeed';
import { Friction } from './Friction';
import { Hunger } from './Hunger';
import { Container } from './Container';
import { IsIllagerCaptain } from './IsIllagerCaptain';
import { Item } from './Item';
import { LavaMovement } from './LavaMovement';
import { Leash } from './Leash';
import { Variant } from './Variant';
import { OnFire } from './OnFire';
import { Projectile } from './Projectile';
import { PushThrough } from './PushThrough';
import { Ride } from './Ride';
import { Riding } from './Riding';
import { Saturation } from './Saturation';
import { Scale } from './Scale';
import { SkinId } from './SkinId';
import { Tame } from './Tame';
import { Families } from './Families';
import { TNT } from './TNT';
import { WantsJockey } from './WantsJockey';
import { CollisionBox } from './CollisionBox';
import { HitBox } from './HitBox';
import { EyeLevel } from './EyeLevel';
import { ViewDirectionVector } from './ViewDirectionVector';
import { AttackBox } from './AttackBox';
import { Movement } from './Movement';
import { UnderwaterMovement } from './UnderwaterMovement';
import { Horse } from './Horse';

const entityToDebugDisplayMap = {};
const debugDisplayTypeNames = Object.freeze({
    Age: '年龄', Breath: '呼吸', Container: '容器', Effects: '状态效果', Equipment: '装备',
    Exhaustion: '疲劳', FlySpeed: '飞行速度', Friction: '摩擦力', GrowUp: '成长',
    HeadLocation: '头部位置', Health: '生命值', Horse: '坐骑', Hunger: '饥饿', ID: 'ID',
    IsClimbing: '正在攀爬', IsFalling: '正在下落', IsIllagerCaptain: '灾厄巡逻队长', IsInWater: '在水中',
    IsOnGround: '在地面', IsSleeping: '正在睡觉', IsSneaking: '正在潜行', IsSprinting: '正在疾跑',
    IsSwimming: '正在游泳', IsValid: '有效', Item: '物品', LavaMovement: '熔岩移动', Leash: '拴绳',
    Location: '位置', Movement: '移动', NameTag: '名称标签', OnFire: '着火', Projectile: '投射物',
    PushThrough: '穿透推动', Ride: '骑乘', Riding: '被骑乘', Rotation: '旋转', Saturation: '饱和度',
    Scale: '缩放', SkinId: '皮肤 ID', Speed: '速度', Tame: '驯服', Target: '目标', TNT: 'TNT',
    TypeID: '类型 ID', UnderwaterMovement: '水下移动', Families: '生物家族', Variant: '变种',
    Velocity: '速度向量', ViewDirection: '视线方向', WantsJockey: '想要骑乘', AttackBox: '攻击箱',
    CollisionBox: '碰撞箱', HitBox: '命中箱', EyeLevel: '眼睛高度', ViewDirectionVector: '视线向量'
});
const debugableProperties = Object.freeze({
    age: Age,
    breath: Breath,
    container: Container,
    effects: Effects,
    equipment: Equipment,
    exhaustion: Exhaustion,
    flyspeed: FlySpeed,
    friction: Friction,
    growup: GrowUp,
    headlocation: HeadLocation,
    health: Health,
    horse: Horse,
    hunger: Hunger,
    id: ID,
    isclimbing: IsClimbing,
    isfalling: IsFalling,
    isillagercaptain: IsIllagerCaptain,
    isinwater: IsInWater,
    isonground: IsOnGround,
    issleeping: IsSleeping,
    issneaking: IsSneaking,
    issprinting: IsSprinting,
    isswimming: IsSwimming,
    isvalid: IsValid,
    item: Item,
    lavamovement: LavaMovement,
    leash: Leash,
    location: Location,
    movement: Movement,
    nametag: NameTag,
    onfire: OnFire,
    projectile: Projectile,
    pushthrough: PushThrough,
    ride: Ride,
    riding: Riding,
    rotation: Rotation,
    saturation: Saturation,
    scale: Scale,
    skinid: SkinId,
    speed: Speed,
    tame: Tame,
    target: Target,
    tnt: TNT,
    typeid: TypeID,
    underwatermovement: UnderwaterMovement,
    families: Families,
    variant: Variant,
    velocity: Velocity,
    viewdirection: ViewDirection,
    wantsjockey: WantsJockey,

    attackbox: AttackBox,
    collisionbox: CollisionBox,
    hitbox: HitBox,
    eyelevel: EyeLevel,
    viewdirectionvector: ViewDirectionVector
});

export class DebugDisplay {
	entity;
	enabledElements = [];
	debugMessage = '';
    textDrawer;

	constructor(entity) {
		this.entity = entity;
		entityToDebugDisplayMap[entity.id] = this;
        this.startDebugDisplay();
	}

    destroy() {
        this.textDrawer.destroy();
        this.textDrawer = void 0;
        this.enabledElements.forEach(element => {
            element.destroy();
        });
        delete entityToDebugDisplayMap[this.entity.id];
    }

    addElement(property) {
        if (DebugDisplay.isDebugableProperty(property) && !this.hasElement(property)) 
            this.enabledElements.push(new debugableProperties[property](this.entity));
    }

    removeElement(property) {
        const index = this.enabledElements.findIndex(e => e instanceof debugableProperties[property]);
        let splicedElement;
        if (index !== -1)
            splicedElement = this.enabledElements.splice(index, 1)[0];
        if (splicedElement instanceof DebugDisplayShapeElement)
            splicedElement.destroy();
    }

    hasElement(property) {
        return this.enabledElements.some(e => e instanceof debugableProperties[property]);
    }

	update() {
		this.debugMessage = '';
		const enabledElements = this.getEnabledElements();
		for (let i = 0; i < enabledElements.length; i++) {
            const element = enabledElements[i];
            if (element instanceof DebugDisplayTextElement)
                this.updateTextElementData(element, i);
            else
                element.update();
        }
		this.debugMessage.trim();
        this.textDrawer.update();
	}
	
	updateTextElementData(element, currIndex) {
		let elementText = element.getFormattedData();
        const elementName = debugDisplayTypeNames[element.type] ?? element.type;
        if (elementText === void 0 ||this.isWhitespace(elementText))
            elementText = elementName + ': §7无数据';
        else
            elementText = elementName + ': ' + elementText;
		if (currIndex !== 0 && !this.isWhitespace(elementText))
			this.debugMessage += '\n§r';
		this.debugMessage += elementText;
	}

	getEnabledElements() {
		return this.enabledElements;
	}

	isWhitespace(str) {
		return /^\s*$/.test(str);
	}

	startDebugDisplay() {
        if (!this.textDrawer)
            this.textDrawer = new DebugDisplayTextDrawer(this);
	}

    static getDebugDisplay(entity) {
        return entityToDebugDisplayMap[entity.id];
    }

    static refreshAllElements() {
        for (const debugDisplay of Object.values(entityToDebugDisplayMap)) {
            const propertiesToRefresh = [];
            for (const element of debugDisplay.getEnabledElements()) {
                const property = Object.entries(debugableProperties).find(([, cls]) => element instanceof cls)?.[0];
                if (property)
                    propertiesToRefresh.push(property);
            }
            for (const property of propertiesToRefresh) {
                debugDisplay.removeElement(property);
                debugDisplay.addElement(property);
            }
        };
    }

    static getDebugableProperties() {
        return Object.keys(debugableProperties);
    }

    static isDebugableProperty(property) {
        return Object.keys(debugableProperties).includes(property);
    }

    static onTick() {
        for (const entityId in entityToDebugDisplayMap) {
            const debugDisplay = entityToDebugDisplayMap[entityId];
            if (!debugDisplay)
                continue;
            debugDisplay.update();
        }
    }

    static onEntityRemove(event) {
        const entity = event.removedEntity;
        if (!entity || !entityToDebugDisplayMap[entity.id])
            return;
        entityToDebugDisplayMap[entity.id].destroy();
    }

    static onShutdown() {
        for (const entityId in entityToDebugDisplayMap) {
            const debugDisplay = entityToDebugDisplayMap[entityId];
            if (!debugDisplay)
                continue;
            debugDisplay.destroy();
        }
    }
}

system.runInterval(DebugDisplay.onTick);
world.beforeEvents.entityRemove.subscribe(DebugDisplay.onEntityRemove);
system.beforeEvents.shutdown.subscribe(DebugDisplay.onShutdown);
