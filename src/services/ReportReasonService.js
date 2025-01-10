const ReportReason = require("../models/ReportReason");
const ApiError = require("../exceptions/ApiError");

class ReportReasonService {
  // Lấy danh sách tất cả báo cáo có phân trang
  async getAllReports(page = 1, limit = 10, filters = {}) {
    try {
      const offset = (page - 1) * limit;

      // Mở rộng câu query để lấy thêm thông tin chi tiết
      let sql = `
        SELECT 
          rr.*,
          u.full_name as reporter_name,
          r.comment as review_content,
          r.rating as review_rating,
          r.hospital_id as review_hospital_id,
          h.name as hospital_name,
          pgc.content as gallery_comment_content,
          pg.caption as gallery_caption,
          ppc.content as post_comment_content,
          pp.title as post_title,
          CAST(rr.resolved AS UNSIGNED) as resolved
        FROM report_reasons rr
        LEFT JOIN users u ON rr.reported_by = u.id
        LEFT JOIN reviews r ON rr.review_id = r.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN pet_gallery_comments pgc ON rr.pet_gallery_comment_id = pgc.id
        LEFT JOIN pet_gallery pg ON pgc.gallery_id = pg.id
        LEFT JOIN pet_post_comments ppc ON rr.pet_post_comment_id = ppc.id
        LEFT JOIN pet_posts pp ON ppc.post_id = pp.id
      `;

      // Xây dựng điều kiện WHERE dựa trên filters
      const whereConditions = [];
      const params = [];

      if (filters.resolved !== undefined) {
        whereConditions.push("rr.resolved = ?");
        params.push(filters.resolved);
      }

      if (filters.reportType) {
        switch (filters.reportType) {
          case "review":
            whereConditions.push("rr.review_id IS NOT NULL");
            break;
          case "gallery_comment":
            whereConditions.push("rr.pet_gallery_comment_id IS NOT NULL");
            break;
          case "post_comment":
            whereConditions.push("rr.pet_post_comment_id IS NOT NULL");
            break;
        }
      }

      if (whereConditions.length > 0) {
        sql += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      // Thêm ORDER BY và LIMIT
      sql += `
        ORDER BY rr.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      params.push(limit, offset);

      // Query để đếm tổng số báo cáo
      let countSql = `
        SELECT COUNT(*) as total 
        FROM report_reasons rr
      `;
      if (whereConditions.length > 0) {
        countSql += ` WHERE ${whereConditions.join(" AND ")}`;
      }

      // Thực hiện cả hai query
      const [reports, [countResult]] = await Promise.all([
        ReportReason.query(sql, params),
        ReportReason.query(countSql, params.slice(0, -2)),
      ]);

      // Format kết quả với thông tin chi tiết hơn
      const formattedReports = reports.map((report) => ({
        id: report.id,
        reason: report.reason,
        resolved: Boolean(report.resolved),
        created_at: report.created_at,
        reporter: {
          id: report.reported_by,
          name: report.reporter_name,
        },
        reported_content: {
          type: report.review_id
            ? "review"
            : report.pet_gallery_comment_id
            ? "gallery_comment"
            : "post_comment",
          id:
            report.review_id ||
            report.pet_gallery_comment_id ||
            report.pet_post_comment_id,
          content:
            report.review_content ||
            report.gallery_comment_content ||
            report.post_comment_content,
          details: report.review_id
            ? {
                rating: report.review_rating,
                hospital: {
                  id: report.review_hospital_id,
                  name: report.hospital_name,
                },
              }
            : report.pet_gallery_comment_id
            ? {
                gallery: {
                  caption: report.gallery_caption,
                },
              }
            : {
                post: {
                  title: report.post_title,
                },
              },
        },
      }));

      return {
        reports: formattedReports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          totalPages: Math.ceil(countResult.total / limit),
        },
      };
    } catch (error) {
      console.error("Get all reports error:", error);
      throw new ApiError(500, "Lỗi khi lấy danh sách báo cáo", error.message);
    }
  }

  // Đánh dấu báo cáo đã được xử lý
  async resolveReport(reportId) {
    try {
      const report = await ReportReason.findById(reportId);
      if (!report) {
        throw new ApiError(404, "Không tìm thấy báo cáo");
      }

      await ReportReason.resolve(reportId);
      return {
        message: "Đã đánh dấu báo cáo là đã xử lý",
        reportId,
      };
    } catch (error) {
      console.error("Resolve report error:", error);
      throw error;
    }
  }

  // Lấy chi tiết một báo cáo
  async getReportDetail(reportId) {
    try {
      const sql = `
         SELECT 
          rr.*,
          u.full_name as reporter_name,
          r.comment as review_content,
          r.rating as review_rating,
          r.hospital_id as review_hospital_id,
          h.name as hospital_name,
          pgc.content as gallery_comment_content,
          pg.caption as gallery_caption,
          ppc.content as post_comment_content,
          pp.title as post_title,
          CAST(rr.resolved AS UNSIGNED) as resolved
        FROM report_reasons rr
        LEFT JOIN users u ON rr.reported_by = u.id
        LEFT JOIN reviews r ON rr.review_id = r.id
        LEFT JOIN hospitals h ON r.hospital_id = h.id
        LEFT JOIN pet_gallery_comments pgc ON rr.pet_gallery_comment_id = pgc.id
        LEFT JOIN pet_gallery pg ON pgc.gallery_id = pg.id
        LEFT JOIN pet_post_comments ppc ON rr.pet_post_comment_id = ppc.id
        LEFT JOIN pet_posts pp ON ppc.post_id = pp.id
        WHERE rr.id = ?
      `;

      const [report] = await ReportReason.query(sql, [reportId]);

      if (!report) {
        throw new ApiError(404, "Không tìm thấy báo cáo");
      }

      return {
        id: report.id,
        reason: report.reason,
        resolved: Boolean(report.resolved),
        reporter: {
          id: report.reported_by,
          name: report.reporter_name,
        },
        reported_content: {
          type: report.review_id
            ? "review"
            : report.pet_gallery_comment_id
            ? "gallery_comment"
            : "post_comment",
          id:
            report.review_id ||
            report.pet_gallery_comment_id ||
            report.pet_post_comment_id,
          content:
            report.review_content ||
            report.gallery_comment_content ||
            report.post_comment_content,
        },
        created_at: report.created_at,
      };
    } catch (error) {
      console.error("Get report detail error:", error);
      throw error;
    }
  }
}

module.exports = new ReportReasonService();
