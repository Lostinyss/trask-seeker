import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"TrashSeeker — ระบบตรวจสอบขยะอัจฉริยะ",description:"จัดการสถานที่ กล้อง สมาชิก และตรวจจับขยะด้วย TrashTrack AI API"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
