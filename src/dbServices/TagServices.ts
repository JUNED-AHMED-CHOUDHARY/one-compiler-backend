import prisma from "../config/prisma";

class TagServices {
  static async getTagsBySlugNames(slugNames: string[]) {
    return await prisma.topicTags.findMany({
      where: {
        slug_name: {
          in: slugNames
        }
      }
    });
  }
}

export default TagServices;
