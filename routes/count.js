const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get(['/id/:name_id', '/'], async (req, res) => {
    const name_id = req.params.name_id || req.query.id;
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // Lấy IP của client

    try {
        // Kiểm tra ID trong bảng Counts
        const foundId = await prisma.counts.findUnique({
            where: { name_id },
        });

        // Mặc định bộ đếm
        let currentCount = foundId ? foundId.count : 0;

        // Tìm bản ghi AccessLog liên quan đến IP
        const recentLog = await prisma.accessLog.findUnique({
            where: { ip_address }, // Chỉ cần IP vì `@unique` đã đảm bảo duy nhất
        });

        // Kiểm tra điều kiện tăng bộ đếm
        const shouldIncrement =
            !recentLog || // Người dùng mới
            new Date() - new Date(recentLog.last_accessed) > 60 * 60 * 1000; // Hoặc đã quá 1 giờ

        if (shouldIncrement) {
            let updateCount;
            if (foundId) {
                // Tăng bộ đếm nếu ID tồn tại
                updateCount = await prisma.counts.update({
                    where: { name_id },
                    data: { count: foundId.count + 1 },
                });
            } else {
                // Tạo mới và đặt bộ đếm ban đầu là 1
                updateCount = await prisma.counts.create({
                    data: { name_id, count: 1 },
                });
            }

            // Cập nhật hoặc tạo mới AccessLog
            await prisma.accessLog.upsert({
                where: { ip_address },
                update: {
                    last_accessed: new Date(), // Cập nhật thời gian truy cập
                    countId: updateCount.id, // Liên kết với Count
                },
                create: {
                    ip_address,
                    last_accessed: new Date(),
                    countId: updateCount.id, // Liên kết với Count
                },
            });

            // Cập nhật bộ đếm hiện tại sau khi tăng
            currentCount = updateCount.count;
        }

        // Trả về giá trị bộ đếm hiện tại
        res.json({
            status: "success",
            message: shouldIncrement
                ? `The count of ID '${name_id}' was successfully updated`
                : `The count remains the same. Last access was within 1 hour.`,
            count: currentCount,
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            status: "error",
            message: error.message || "An error occurred while processing the request.",
        });
    }
});

module.exports = router;
