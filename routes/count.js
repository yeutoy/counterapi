const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get(['/id/:name_id', '/'], async (req, res) => {
    const name_id = req.params.name_id || req.query.id;
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // Lấy địa chỉ IP của client

    try {
        // Kiểm tra xem có bản ghi nào của địa chỉ IP này trong bảng AccessLog chưa và thời gian truy cập gần đây
        const recentLog = await prisma.accessLog.findFirst({
            where: {
                ip_address: ip_address,
                last_accessed: {
                    gte: new Date(new Date().getTime() - 60 * 60 * 1000), // Kiểm tra trong vòng 1 giờ qua
                },
            },
        });

        // Kiểm tra ID trong bảng Counts
        const foundId = await prisma.counts.findUnique({
            where: { name_id }
        });

        // Nếu không có bản ghi IP (người dùng mới) hoặc thời gian truy cập đã quá 1 giờ
        if (!recentLog || (recentLog && new Date() - new Date(recentLog.last_accessed) > 60 * 60 * 1000)) {
            // Nếu ID tồn tại, tăng bộ đếm
            let updateCount;
            if (foundId) {
                // Tăng bộ đếm lên 1
                updateCount = await prisma.counts.update({
                    where: { name_id },
                    data: { count: foundId.count + 1 }
                });
            } else {
                // Nếu ID không tồn tại, tạo mới và tăng bộ đếm lên 1
                updateCount = await prisma.counts.create({
                    data: { name_id, count: 1 }
                });
            }

            // Lưu thông tin IP và thời gian vào bảng AccessLog
            await prisma.accessLog.upsert({
                where: { ip_address },
                update: {
                    last_accessed: new Date(),  // Cập nhật thời gian truy cập
                    countId: foundId ? foundId.id : updateCount.id, // Liên kết với Count
                },
                create: {
                    ip_address,
                    last_accessed: new Date(),
                    countId: updateCount.id, // Liên kết với Count
                },
            });

            // Trả về bộ đếm sau khi tăng
            return res.json({
                status: "success",
                message: `The count of ID '${updateCount.name_id}' was successfully updated`,
                count: updateCount.count,  // Trả về bộ đếm sau khi tăng
            });

        } else {
            // Nếu IP đã truy cập trong vòng 1 giờ qua thì không thay đổi bộ đếm
            // Trả về giá trị bộ đếm hiện tại từ cơ sở dữ liệu
            return res.json({
                status: "success",
                message: `The count remains the same. Last access was within 1 hour.`,
                count: foundId ? foundId.count : 0,  // Trả về giá trị bộ đếm hiện tại
            });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            status: "error",
            message: error.message || "An error occurred while processing the request.",
        });
    }
});

module.exports = router;
