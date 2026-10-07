// Khớp StudentResourceController.getCourseResources (`be/.../material/controller/`).
export interface CourseResource {
  id: number;
  title: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  chapterId: number | null;
  lessonId: number | null;
  createdAt: string;
}
