/**
 * Công cụ hiển thị log trên terminal để theo dõi các truy vấn và thao tác cơ sở dữ liệu
 */
export const logDB = {
  read: (collection: string, query: any, count: number) => {
    const time = new Date().toLocaleTimeString();
    console.log(
      `\x1b[36m[DB READ] [${time}] Collection: ${collection} | Query: ${JSON.stringify(query)} | Kết quả: Tìm thấy ${count} bản ghi\x1b[0m`
    );
  },
  write: (collection: string, action: string, docId: string, data?: any) => {
    const time = new Date().toLocaleTimeString();
    console.log(
      `\x1b[32m[DB WRITE] [${time}] Collection: ${collection} | Action: ${action} | Document ID: ${docId}\x1b[0m`,
      data ? JSON.stringify(data) : ''
    );
  },
  error: (collection: string, action: string, error: any) => {
    const time = new Date().toLocaleTimeString();
    console.error(
      `\x1b[31m[DB ERROR] [${time}] Collection: ${collection} | Action: ${action} | Lỗi: ${error.message || error}\x1b[0m`
    );
  }
};
