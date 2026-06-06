import { type Request } from "express";
import { type ParamsDictionary } from "express-serve-static-core";

export type TypedRequestBody<TBody> = Request<ParamsDictionary, unknown, TBody>;
