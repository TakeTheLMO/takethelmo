import "server-only";
import { localAuth } from "../local-auth/database";
import { PortalContentStore } from "./database";
export function portalContent() { return new PortalContentStore(localAuth().db); }
