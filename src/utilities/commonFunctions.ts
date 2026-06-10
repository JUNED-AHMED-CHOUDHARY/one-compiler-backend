import { customAlphabet } from "nanoid";
import { z } from "zod";

import { ID_PREFIXES } from "../constants/idPrefixes";

const ALPHABETS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ID_LENGTH = 9;
const nanoIdFn = customAlphabet(ALPHABETS, ID_LENGTH);

export const generateId = (prefix: ID_PREFIXES) => {
  return `${prefix}_${nanoIdFn()}`;
};

export const createIdSchema = (prefix: ID_PREFIXES) => z.string().regex(new RegExp(`^${prefix}_[0-9a-zA-Z]{9}$`));
