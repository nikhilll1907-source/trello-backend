import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  messages: MessagesAnnotation.spec.messages,
  userId: Annotation(),
  boardId: Annotation(),
  organizationId: Annotation(),
  boardData: Annotation(),
  intent: Annotation(),
  error: Annotation(),
});
