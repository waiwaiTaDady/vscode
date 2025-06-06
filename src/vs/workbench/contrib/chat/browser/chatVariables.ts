/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { coalesce } from '../../../../base/common/arrays.js';
import { IChatRequestVariableData, IChatRequestVariableEntry } from '../common/chatModel.js';
import { ChatRequestToolPart, IParsedChatRequest } from '../common/chatParserTypes.js';
import { IChatVariablesService, IDynamicVariable } from '../common/chatVariables.js';
import { IChatWidgetService } from './chat.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';

export class ChatVariablesService implements IChatVariablesService {
	declare _serviceBrand: undefined;

	constructor(
		@IChatWidgetService private readonly chatWidgetService: IChatWidgetService,
	) { }

	resolveVariables(prompt: IParsedChatRequest, attachedContextVariables: IChatRequestVariableEntry[] | undefined): IChatRequestVariableData {
		let resolvedVariables: IChatRequestVariableEntry[] = [];

		prompt.parts
			.forEach((part, i) => {
				if (part instanceof ChatRequestToolPart) {
					resolvedVariables[i] = part.toVariableEntry();
				}
			});

		// Make array not sparse
		resolvedVariables = coalesce<IChatRequestVariableEntry>(resolvedVariables);

		// "reverse", high index first so that replacement is simple
		resolvedVariables.sort((a, b) => b.range!.start - a.range!.start);

		if (attachedContextVariables) {
			// attachments not in the prompt
			resolvedVariables.push(...attachedContextVariables);
		}


		return {
			variables: resolvedVariables,
		};
	}

	getDynamicVariables(sessionId: string): ReadonlyArray<IDynamicVariable> {
		// This is slightly wrong... the parser pulls dynamic references from the input widget, but there is no guarantee that message came from the input here.
		// Need to ...
		// - Parser takes list of dynamic references (annoying)
		// - Or the parser is known to implicitly act on the input widget, and we need to call it before calling the chat service (maybe incompatible with the future, but easy)
		const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
		if (!widget || !widget.viewModel || !widget.supportsFileReferences) {
			return [];
		}

		const model = widget.getContrib<ChatDynamicVariableModel>(ChatDynamicVariableModel.ID);
		if (!model) {
			return [];
		}

		return model.variables;
	}

}
