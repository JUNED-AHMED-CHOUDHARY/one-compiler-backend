import { customAlphabet } from "nanoid";
import { ID_PREFIXES } from "../constants/idPrefixes";

const ALPHABETS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ID_LENGTH = 9;
const nanoIdFn = customAlphabet(ALPHABETS, ID_LENGTH);

export const generateId = (prefix: ID_PREFIXES) => {
  return `${prefix}_${nanoIdFn()}`;
};
