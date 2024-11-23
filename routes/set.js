const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Route xử lý với path parameters: /set/:name_id/:num_count
router.get('/:name_id/:num_count', async (req, res) => {
    let name_id = req.params.name_id;
    let num_count = req.params.num_count;
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Kiểm tra giá trị count có phải là số không
    if (isNaN(num_count)) {
        return res.status(400).json({
            status: "error",
            message: `Invalid count value for '${name_id}'. Count should be a number`
        });
    }

    try {
        const foundId = await prisma.counts.findUnique({
            where: { name_id },
            include: { accessLogs: true }, // Load related access logs
        });

        if (foundId) {
            // Cập nhật giá trị count và log thông tin access
            const setCount = await prisma.counts.update({
                where: { name_id },
                data: {
                    count: parseInt(num_count),
                    accessLogs: {
                        create: {
                            ip_address,
                            last_accessed: new Date(),
                        },
                    },
                },
            });

            res.status(201).json({
                status: "success",
                message: `The count of ID '${setCount.name_id}' was successfully changed`,
                count: setCount.count,
            });

            // Log the operation
            console.log("Update:", setCount);
        } else {
            // Tạo bản ghi mới và log thông tin access
            const addNewId = await prisma.counts.create({
                data: {
                    name_id,
                    count: parseInt(num_count),
                    accessLogs: {
                        create: {
                            ip_address,
                            last_accessed: new Date(),
                        },
                    },
                },
            });

            res.status(202).json({
                status: "success",
                message: `The ID '${addNewId.name_id}' was added and the count was successfully set`,
                count: addNewId.count,
            });

            // Log the operation
            console.log("Create:", addNewId);
        }
    } catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({
            status: "error",
            message: "An error occurred while processing the request.",
        });
    }
});

// Route xử lý với query parameters: /set?id={name_id}&count={num_count}
router.get('/', async (req, res) => {
    let name_id = req.query.id;
    let num_count = req.query.count;
    const ip_address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Kiểm tra giá trị count có phải là số không
    if (isNaN(num_count)) {
        return res.status(400).json({
            status: "error",
            message: `Invalid count value for '${name_id}'. Count should be a number`
        });
    }

    try {
        const foundId = await prisma.counts.findUnique({
            where: { name_id },
            include: { accessLogs: true }, // Load related access logs
        });

        if (foundId) {
            // Cập nhật giá trị count và log thông tin access
            const setCount = await prisma.counts.update({
                where: { name_id },
                data: {
                    count: parseInt(num_count),
                    accessLogs: {
                        create: {
                            ip_address,
                            last_accessed: new Date(),
                        },
                    },
                },
            });

            res.status(201).json({
                status: "success",
                message: `The count of ID '${setCount.name_id}' was successfully changed`,
                count: setCount.count,
            });

            // Log the operation
            console.log("Update:", setCount);
        } else {
            // Tạo bản ghi mới và log thông tin access
            const addNewId = await prisma.counts.create({
                data: {
                    name_id,
                    count: parseInt(num_count),
                    accessLogs: {
                        create: {
                            ip_address,
                            last_accessed: new Date(),
                        },
                    },
                },
            });

            res.status(202).json({
                status: "success",
                message: `The ID '${addNewId.name_id}' was added and the count was successfully set`,
                count: addNewId.count,
            });

            // Log the operation
            console.log("Create:", addNewId);
        }
    } catch (error) {
        console.error("Error handling request:", error);
        res.status(500).json({
            status: "error",
            message: "An error occurred while processing the request.",
        });
    }
});

module.exports = router;
