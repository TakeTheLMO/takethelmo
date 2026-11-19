import "server-only";
import { localAuth } from "../local-auth/database";
import { PortalContentStore } from "./database";
export async function portalContent() { return new PortalContentStore((await localAuth()).db); }
