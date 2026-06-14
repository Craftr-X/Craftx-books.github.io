---
layout: doc
title: 从0开始构建AgentHarness
description: 从零开始构建 Agent Harness 的完整指南
aside: false
editLink: false
---

# 从0开始构建AgentHarness

> 从零开始构建 Agent Harness 的完整指南

## 目录

- [开篇词｜框架正在坍塌：像写操作系统一样，复刻OpenClaw的底层Harness](./开篇词｜框架正在坍塌：像写操作系统一样，复刻OpenClaw的底层Harness.md)
- [01｜架构演进：从Framework到Harness，Agent到底需要怎样的底层支撑？](./01｜架构演进：从Framework到Harness，Agent到底需要怎样的底层支撑？.md)
- [02｜核心心脏：手写Agent的MainLoop](./02｜核心心脏：手写Agent的MainLoop.md)
- [03｜慢思考与自省：在ReAct循环中剥离独立的Thinking阶段](./03｜慢思考与自省：在ReAct循环中剥离独立的Thinking阶段.md)
- [04｜大脑接入：抽象Provider接口，适配Claude与OpenAI兼容大模型](./04｜大脑接入：抽象Provider接口，适配Claude与OpenAI兼容大模型.md)
- [05｜动作延伸：构建强扩展性的ToolRegistry与分发机制](./05｜动作延伸：构建强扩展性的ToolRegistry与分发机制.md)
- [06｜大道至简：解密OpenClaw最简工具集法则与YOLO执行哲学](./06｜大道至简：解密OpenClaw最简工具集法则与YOLO执行哲学.md)
- [07｜容错艺术：实现支持多级模糊匹配的稳健Edit工具](./07｜容错艺术：实现支持多级模糊匹配的稳健Edit工具.md)
- [08｜并发提效：如何让Agent在单轮中并行调用多个互相独立的工具？](./08｜并发提效：如何让Agent在单轮中并行调用多个互相独立的工具？.md)
- [09｜飞书集成：打通真实世界，将go-tiny-claw接入飞书机器人的事件流](./09｜飞书集成：打通真实世界，将go-tiny-claw接入飞书机器人的事件流.md)
- [10｜提示词组装：告别面条代码，动态加载AGENTS.md与外挂Skills.md](./10｜提示词组装：告别面条代码，动态加载AGENTS.md与外挂Skills.md)
- [11｜会话管理：Session物理隔离与WorkingMemory的底层实现](./11｜会话管理：Session物理隔离与WorkingMemory的底层实现.md)
- [12｜突破内存：基于阶梯降级的ContextCompaction策略](./12｜突破内存：基于阶梯降级的ContextCompaction策略.md)
- [13｜记忆沉淀：状态外部化，基于文件系统的持久化记忆与待办管理](./13｜记忆沉淀：状态外部化，基于文件系统的持久化记忆与待办管理.md)
- [14｜错误自愈：上下文感知的ErrorRecovery提示模板注入机制](./14｜错误自愈：上下文感知的ErrorRecovery提示模板注入机制.md)
- [15｜行为干预：防止Agent陷入“死循环”的SystemReminders机制](./15｜行为干预：防止Agent陷入“死循环”的SystemReminders机制.md)
- [16｜防御纵深：利用Middleware实现高危命令拦截与飞书人工审批](./16｜防御纵深：利用Middleware实现高危命令拦截与飞书人工审批.md)
- [17｜任务委派：引入Subagent隔离复杂探索任务的上下文瓶颈](./17｜任务委派：引入Subagent隔离复杂探索任务的上下文瓶颈.md)
- [18｜成本与状态追踪：在Harness层拦截并记录Token消耗与执行耗时](./18｜成本与状态追踪：在Harness层拦截并记录Token消耗与执行耗时.md)
- [19｜洞察黑盒：为Agent引入Tracing机制复盘失败决策路径](./19｜洞察黑盒：为Agent引入Tracing机制复盘失败决策路径.md)
- [20｜科学度量：如何构建Benchmark自动化评估脚本，科学量化Harness引擎性能？](./20｜科学度量：如何构建Benchmark自动化评估脚本，科学量化Harness引擎性能？.md)
- [阶段作业｜让你的Agent学会“慢思考+动手做事”](./阶段作业｜让你的Agent学会“慢思考+动手做事”.md)
