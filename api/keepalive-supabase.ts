import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database';

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function handler(
  req: { method?: string },
  res: {
    status: (code: number) => { json: (data: unknown) => void };
  }
): Promise<void> {
  try {
    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        success: false,
        error: 'Missing Supabase environment variables',
        timestamp: new Date().toISOString(),
      });
    }

    const supabase = createClient<Database>(
      supabaseUrl,
      supabaseServiceKey
    );

    const totalCycles = 2;
    const results = [];

    for (let cycle = 1; cycle <= totalCycles; cycle++) {
      // Get a test employee ID from the database
      const { data: testEmployee, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      if (empError || !testEmployee) {
        console.warn('[Keepalive-Supabase] No active employees found, skipping cycle');
        results.push({
          cycle,
          status: 'skipped',
          reason: 'No active employees found',
        });
        continue;
      }

      try {
        const testEmployeeId = testEmployee.id;

        // Get an admin user to assign the task
        const { data: adminUser, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single();

        if (adminError || !adminUser) {
          console.warn('[Keepalive-Supabase] Cycle ${cycle}: No admin user found, skipping cycle');
          results.push({
            cycle,
            status: 'skipped',
            reason: 'No admin user found to assign task',
          });
          continue;
        }

        const assignedBy = adminUser.id;

        // 1. CREATE task
        const taskTitle = `[Keepalive Test] ${new Date().toISOString()}`;

        const { data: createdTask, error: createError } = await (
          supabase.from('employee_tasks') as unknown
        )
          .insert({
            employee_id: testEmployeeId,
            title: taskTitle,
            description: 'Automatic keep-alive test - will be deleted shortly',
            status: 'pending',
            deadline: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
            assigned_by: assignedBy,
          })
          .select()
          .single();

        if (createError || !createdTask) {
          throw new Error(`Failed to create task: ${createError?.message || 'Unknown error'}`);
        }

        const taskId = createdTask.id;

        // 2. WAIT 1 second and VIEW task
        await sleep(1000);

        const { data: viewedTask, error: viewError } = await (
          supabase.from('employee_tasks') as unknown
        )
          .select('*')
          .eq('id', taskId)
          .single();

        if (viewError || !viewedTask) {
          throw new Error(`Failed to view task: ${viewError?.message || 'Unknown error'}`);
        }

        // 3. WAIT 1 more second and DELETE task
        await sleep(1000);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deleteError } = await (supabase.from('employee_tasks') as any)
          .delete()
          .eq('id', taskId);

        if (deleteError) {
          throw new Error(`Failed to delete task: ${deleteError.message}`);
        }

        results.push({
          cycle,
          status: 'success',
          taskId,
          message: 'Task created, viewed, and deleted',
        });
      } catch (cycleError) {
        const errorMessage =
          cycleError instanceof Error ? cycleError.message : String(cycleError);
        console.error(`[Keepalive-Supabase] Cycle ${cycle} failed: ${errorMessage}`);
        results.push({
          cycle,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase keep-alive executed',
      cycles: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Keepalive-Supabase] Fatal error: ${errorMessage}`);

    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
