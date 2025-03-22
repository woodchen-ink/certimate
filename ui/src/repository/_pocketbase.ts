import PocketBase from "pocketbase";

let pb: PocketBase;
export const getPocketBase = () => {
  if (pb) return pb;
  pb = new PocketBase("/");
  return pb;
};

export const COLLECTION_NAME_ADMIN = "_superusers";
export const COLLECTION_NAME_ACCESS = "access";
export const COLLECTION_NAME_CERTIFICATE = "certificate";
export const COLLECTION_NAME_SETTINGS = "settings";
export const COLLECTION_NAME_WORKFLOW = "workflow";
export const COLLECTION_NAME_WORKFLOW_RUN = "workflow_run";
export const COLLECTION_NAME_WORKFLOW_OUTPUT = "workflow_output";
export const COLLECTION_NAME_WORKFLOW_LOG = "workflow_logs";
