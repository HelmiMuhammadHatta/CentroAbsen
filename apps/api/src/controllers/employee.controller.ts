import { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service';

export class EmployeeController {
  static async list(req: Request, res: Response) {
    try {
      const employees = await EmployeeService.listEmployees();
      res.json(employees);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const emp = await EmployeeService.getEmployee(req.params.id as string);
      if (!emp) return res.status(404).json({ error: 'Not found' });
      res.json(emp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const emp = await EmployeeService.createEmployee(req.body);
      res.json(emp);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const emp = await EmployeeService.updateEmployee(req.params.id as string, req.body);
      res.json(emp);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  }

  static async getEffectiveShift(req: Request, res: Response) {
    try {
      res.json({ data: null }); // CentroAbsen Phase 1 does not use shifts
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
