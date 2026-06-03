/**
 * 测试脚本：检查 uploads 表的数据和统计逻辑
 * 运行: node test-uploads-count.js
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUploadsCount() {
  console.log('🔍 开始检查 uploads 表...\n')

  // 1. 检查 uploads 表结构
  console.log('📋 Step 1: 检查 uploads 表结构')
  const { data: columns, error: schemaError } = await supabase
    .from('uploads')
    .select('*')
    .limit(1)

  if (schemaError) {
    console.error('❌ 查询失败:', schemaError)
    return
  }

  if (columns && columns.length > 0) {
    console.log('✅ 表结构字段:', Object.keys(columns[0]))
  }

  // 2. 查询所有 uploads 数据
  console.log('\n📊 Step 2: 查询所有 uploads 记录')
  const { data: allUploads, error: allError } = await supabase
    .from('uploads')
    .select('id, filename, uploaded_at, firm_id, client_id')
    .order('uploaded_at', { ascending: false })

  if (allError) {
    console.error('❌ 查询失败:', allError)
    return
  }

  console.log(`✅ 总共有 ${allUploads?.length || 0} 条上传记录`)

  if (allUploads && allUploads.length > 0) {
    console.log('\n最近 5 条记录:')
    allUploads.slice(0, 5).forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.filename}`)
      console.log(`     上传时间: ${u.uploaded_at}`)
      console.log(`     Firm ID: ${u.firm_id}`)
      console.log(`     Client ID: ${u.client_id}`)
    })
  }

  // 3. 测试本月统计逻辑
  console.log('\n📅 Step 3: 测试本月统计逻辑')
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  console.log(`当前时间: ${now.toISOString()}`)
  console.log(`本月第一天: ${firstDayOfMonth.toISOString()}`)

  // 按 firm_id 分组统计
  const firmIds = [...new Set(allUploads?.map(u => u.firm_id).filter(Boolean))]

  console.log(`\n找到 ${firmIds.length} 个不同的 firm_id`)

  for (const firmId of firmIds) {
    console.log(`\n🏢 Firm ID: ${firmId}`)

    // 统计该 firm 的本月上传
    const { count, error: countError } = await supabase
      .from('uploads')
      .select('*', { count: 'exact', head: true })
      .eq('firm_id', firmId)
      .gte('uploaded_at', firstDayOfMonth.toISOString())

    if (countError) {
      console.error('  ❌ 统计失败:', countError)
    } else {
      console.log(`  ✅ 本月上传数量: ${count || 0}`)
    }

    // 手动统计验证
    const manualCount = allUploads?.filter(u =>
      u.firm_id === firmId &&
      new Date(u.uploaded_at) >= firstDayOfMonth
    ).length || 0

    console.log(`  🔍 手动统计验证: ${manualCount}`)

    if (count !== manualCount) {
      console.log(`  ⚠️  数量不匹配！API 返回 ${count}，手动统计 ${manualCount}`)
    }

    // 显示该 firm 本月的上传记录
    const thisMonthUploads = allUploads?.filter(u =>
      u.firm_id === firmId &&
      new Date(u.uploaded_at) >= firstDayOfMonth
    ) || []

    if (thisMonthUploads.length > 0) {
      console.log(`  📁 本月上传的文件:`)
      thisMonthUploads.forEach((u, i) => {
        console.log(`     ${i + 1}. ${u.filename} (${u.uploaded_at})`)
      })
    }
  }

  console.log('\n✅ 检查完成！')
}

testUploadsCount().catch(console.error)
