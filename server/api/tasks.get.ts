import { prisma } from "../utils/prisma";

export default defineEventHandler(async (event) => {
  try {
   const session = await auth.api.getSession({
  headers: getHeaders(event) as HeadersInit
})

    const userId = session?.user?.id

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { createdBy: userId },
          { assignedTo: userId },
        ],
      },
      include: {
        status: true,
        privilege: true,
        assignee: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });

    console.log("🔄 API /api/tasks retourne", tasks.length, "tâches");
    return tasks;
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Erreur lors de la récupération des tâches",
    });
  }
});