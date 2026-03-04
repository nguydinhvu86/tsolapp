"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách Todo của người dùng hiện tại
export async function getTodos() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return {
                status: "error",
                message: "Unauthorized",
                todos: []
            };
        }

        const todos = await prisma.todo.findMany({
            where: {
                userId: session.user.id
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return {
            status: "success",
            todos: JSON.parse(JSON.stringify(todos))
        };
    } catch (error) {
        console.error("Error fetching todos:", error);
        return {
            status: "error",
            message: "Failed to fetch todos",
            todos: []
        };
    }
}

// 2. Thêm Todo mới
export async function addTodo(text: string) {
    if (!text || text.trim() === '') {
        return { status: "error", message: "Text cannot be empty" };
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { status: "error", message: "Unauthorized" };
        }

        const newTodo = await prisma.todo.create({
            data: {
                text: text.trim(),
                userId: session.user.id,
                completed: false,
            }
        });

        revalidatePath("/dashboard");
        return { status: "success", todo: JSON.parse(JSON.stringify(newTodo)) };
    } catch (error) {
        console.error("Error adding todo:", error);
        return { status: "error", message: "Failed to add todo" };
    }
}

// 3. Đánh dấu hoàn thành / chưa hoàn thành
export async function toggleTodo(id: string, currentStatus: boolean) {
    if (!id) return { status: "error", message: "ID is required" };

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { status: "error", message: "Unauthorized" };
        }

        // Validate ownership
        const todo = await prisma.todo.findUnique({ where: { id } });
        if (!todo || todo.userId !== session.user.id) {
            return { status: "error", message: "Todo not found or unauthorized" };
        }

        const updatedTodo = await prisma.todo.update({
            where: { id },
            data: { completed: !currentStatus }
        });

        revalidatePath("/dashboard");
        return { status: "success", todo: JSON.parse(JSON.stringify(updatedTodo)) };
    } catch (error) {
        console.error("Error toggling todo:", error);
        return { status: "error", message: "Failed to toggle todo" };
    }
}

// 4. Cập nhật nội dung Todo (Tùy chọn)
export async function updateTodoText(id: string, newText: string) {
    if (!id || !newText.trim()) return { status: "error", message: "Invalid input" };

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { status: "error", message: "Unauthorized" };
        }

        const todo = await prisma.todo.findUnique({ where: { id } });
        if (!todo || todo.userId !== session.user.id) {
            return { status: "error", message: "Todo not found or unauthorized" };
        }

        const updatedTodo = await prisma.todo.update({
            where: { id },
            data: { text: newText.trim() }
        });

        revalidatePath("/dashboard");
        return { status: "success", todo: JSON.parse(JSON.stringify(updatedTodo)) };
    } catch (error) {
        console.error("Error updating todo:", error);
        return { status: "error", message: "Failed to update todo" };
    }
}

// 5. Xóa Todo
export async function deleteTodo(id: string) {
    if (!id) return { status: "error", message: "ID is required" };

    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { status: "error", message: "Unauthorized" };
        }

        const todo = await prisma.todo.findUnique({ where: { id } });
        if (!todo || todo.userId !== session.user.id) {
            return { status: "error", message: "Todo not found or unauthorized" };
        }

        await prisma.todo.delete({
            where: { id }
        });

        revalidatePath("/dashboard");
        return { status: "success" };
    } catch (error) {
        console.error("Error deleting todo:", error);
        return { status: "error", message: "Failed to delete todo" };
    }
}
