// validate({ params, query, body }): kiểm tra bằng schema zod; hợp lệ thì gắn kết quả vào req.du_lieu.
const { loi } = require('../utils/loi-nghiep-vu');

function validate(schemas) {
  return (req, res, next) => {
    const duLieu = {};
    const chiTiet = [];
    for (const noi of ['params', 'query', 'body']) {
      if (!schemas[noi]) continue;
      const kq = schemas[noi].safeParse(req[noi] ?? {});
      if (kq.success) duLieu[noi] = kq.data;
      else for (const i of kq.error.issues) chiTiet.push({ noi, truong: i.path.join('.'), thong_bao: i.message });
    }
    if (chiTiet.length) return next(loi.duLieuSai(undefined, chiTiet));
    req.du_lieu = duLieu;
    next();
  };
}

module.exports = validate;
