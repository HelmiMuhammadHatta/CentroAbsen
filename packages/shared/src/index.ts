import { z } from "zod";

export enum Role {
  Employee = "Employee",
  Manager = "Manager",
  Finance = "Finance",
  HrAdmin = "HrAdmin",
}

export enum WorkArrangement {
  Office = "Office",
  Hybrid = "Hybrid",
  Flexible = "Flexible",
}

export enum AttendanceType {
  CheckIn = "CheckIn",
  CheckOut = "CheckOut",
}

export enum WorkMode {
  Office = "Office",
  Home = "Home",
  Anywhere = "Anywhere",
}

export enum RequestStatus {
  Pending = "Pending",
  Approved = "Approved",
  Rejected = "Rejected",
}

// Example schema, to be expanded
export const UserSchema = z.object({
  id: z.string().uuid(),
  nik: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  role: z.nativeEnum(Role),
});
