import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

export const StateAnnotation = Annotation.Root({
  messages: MessagesAnnotation.spec.messages,
  user: Annotation(),
  boardData: Annotation(),
  intent: Annotation(),
  error: Annotation(),
});
