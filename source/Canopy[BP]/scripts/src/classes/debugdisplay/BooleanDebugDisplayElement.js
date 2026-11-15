import { DebugDisplayTextElement } from "./DebugDisplayTextElement";

export class BooleanDebugDisplayElement extends DebugDisplayTextElement  {
    getFormattedBoolean(bool) {
        return '§3' + (bool ? '是' : '否');
    }
}
