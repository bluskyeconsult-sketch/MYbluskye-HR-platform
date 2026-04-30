import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get all available Virtual Assistants
export async function getVirtualAssistants(category = null) {
    let query = supabase.from('virtual_assistants').select('*').eq('is_active', true);
    if (category && category !== 'all') query = query.eq('category', category);
    const { data, error } = await query.order('price', { ascending: true });
    if (error) throw error;
    return data;
}

// Get VA by ID
export async function getVirtualAssistantById(vaId) {
    const { data, error } = await supabase.from('virtual_assistants').select('*').eq('id', vaId).single();
    if (error) throw error;
    return data;
}

// Hire a Virtual Assistant
export async function hireVirtualAssistant(userId, vaId, inputData, title, description) {
    const va = await getVirtualAssistantById(vaId);
    const estimatedCompletion = new Date();
    estimatedCompletion.setMinutes(estimatedCompletion.getMinutes() + (va.delivery_minutes || 30));
    
    const { data, error } = await supabase.from('va_tasks').insert({
        user_id: userId,
        virtual_assistant_id: vaId,
        title: title || va.name,
        description: description,
        input_data: inputData,
        price_paid: va.price,
        status: 'pending',
        estimated_completion_at: estimatedCompletion.toISOString()
    }).select().single();
    
    if (error) throw error;
    
    // Trigger async execution
    setTimeout(() => executeTaskAsync(data.id), 1000);
    
    return { success: true, task: data };
}

// Async task execution
async function executeTaskAsync(taskId) {
    try {
        await supabase.rpc('execute_va_task', { task_id: taskId });
    } catch (err) {
        console.error('Task execution error:', err);
        await supabase.from('va_tasks').update({ status: 'admin_review' }).eq('id', taskId);
    }
}

// Get task status with logs
export async function getTaskStatus(taskId, userId) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('*, virtual_assistants:virtual_assistant_id(*)')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
    if (error) throw error;
    
    const { data: logs } = await supabase
        .from('va_execution_logs')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
    
    return { ...data, logs: logs || [] };
}

// Get user's tasks
export async function getUserTasks(userId, status = null) {
    let query = supabase
        .from('va_tasks')
        .select('*, virtual_assistants:virtual_assistant_id(name, specialty, qa_score)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Accept completed task
export async function acceptTask(taskId, userId) {
    const { error } = await supabase
        .from('va_tasks')
        .update({ status: 'completed' })
        .eq('id', taskId)
        .eq('user_id', userId)
        .eq('status', 'qa_review');
    if (error) throw error;
    return { success: true };
}

// Reject task (triggers retry or admin review)
export async function rejectTask(taskId, userId, reason) {
    const { data: task } = await supabase
        .from('va_tasks')
        .select('rejection_count')
        .eq('id', taskId)
        .single();
    
    const newCount = (task.rejection_count || 0) + 1;
    
    if (newCount >= 3) {
        await supabase.from('va_tasks').update({ 
            status: 'admin_review', rejection_reason: reason, rejection_count: newCount
        }).eq('id', taskId);
        return { success: true, action: 'admin_review', message: 'Task sent to admin for review.' };
    } else {
        await supabase.from('va_tasks').update({ 
            status: 'pending', rejection_reason: reason, rejection_count: newCount, output_data: null
        }).eq('id', taskId);
        setTimeout(() => executeTaskAsync(taskId), 1000);
        return { success: true, action: 'retry', message: `Task rejected. Retrying (attempt ${newCount + 1}/3).` };
    }
}

// Download task output
export async function downloadTaskOutput(taskId, userId) {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('output_data, status')
        .eq('id', taskId)
        .eq('user_id', userId)
        .single();
    if (error || data.status !== 'completed') throw new Error('Task not available for download');
    return data.output_data;
}

// Get user's VA credits
export async function getUserCredits(userId) {
    let { data, error } = await supabase
        .from('va_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code === 'PGRST116') {
        const { data: newData } = await supabase
            .from('va_credits')
            .insert({ user_id: userId, balance: 0 })
            .select()
            .single();
        return newData.balance;
    }
    return data?.balance || 0;
}

// Admin: Get all tasks for review
export async function getAdminReviewTasks() {
    const { data, error } = await supabase
        .from('va_tasks')
        .select('*, virtual_assistants:virtual_assistant_id(name), profiles:user_id(email, full_name)')
        .eq('status', 'admin_review')
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
}

// Admin: Approve task
export async function adminApproveTask(taskId, adminId) {
    const { error } = await supabase
        .from('va_tasks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', taskId);
    if (error) throw error;
    return { success: true };
}

// Admin: Refund task
export async function adminRefundTask(taskId, adminId, reason) {
    const { data: task } = await supabase
        .from('va_tasks')
        .select('user_id, price_paid')
        .eq('id', taskId)
        .single();
    
    await supabase.rpc('add_va_credits', { p_user_id: task.user_id, p_amount: Math.ceil(task.price_paid) });
    await supabase.from('va_tasks').update({ status: 'refunded' }).eq('id', taskId);
    return { success: true };
}

// Admin: Get all VAs
export async function adminGetAllVAs() {
    const { data, error } = await supabase
        .from('virtual_assistants')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
}

// Admin: Add new VA
export async function adminAddVA(vaData, adminId) {
    const { data, error } = await supabase
        .from('virtual_assistants')
        .insert(vaData)
        .select()
        .single();
    if (error) throw error;
    return { success: true, va: data };
}

// Admin: Update VA
export async function adminUpdateVA(vaId, vaData) {
    const { error } = await supabase.from('virtual_assistants').update(vaData).eq('id', vaId);
    if (error) throw error;
    return { success: true };
}

// Admin: Toggle VA active status
export async function adminToggleVA(vaId, isActive) {
    const { error } = await supabase.from('virtual_assistants').update({ is_active: isActive }).eq('id', vaId);
    if (error) throw error;
    return { success: true };
}
