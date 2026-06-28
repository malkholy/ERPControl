USE [HR]
GO
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE OR ALTER PROCEDURE [dbo].[APIHRControlOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
    @Year           int = 0,
    @Month          int = 0, 
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            = 0 output,
    @Message        nvarchar(500)  = '' output
as
begin
    set nocount on;
    set @State = 0;
    set @Message = '';

    -- Parse EmployeeID from LineData if present
    DECLARE @EmployeeID INT = NULL;
    IF @LineData IS NOT NULL AND @LineData <> '' AND ISJSON(@LineData) > 0
    BEGIN
        SET @EmployeeID = TRY_CAST(JSON_VALUE(@LineData, '$.EmployeeID') AS INT);
    END

    IF @Operation = 'Get Employee Detail' AND @EmployeeID IS NOT NULL
    BEGIN
        -- 1. Employee Details
        select EmployeeID ,   Fullname , BranchName , DepartmentName , DivisionName , JobName , ( select FullName from EmployeeMaster x where x.EmployeeID=a.ReportTo ) as ReportingTo , a.JoiningDate , Address , ContractDate , ContractExpiredDate , a.StateDescription as EmployeeCurrentStauts , LeavingDate , TerminationNotes , case when a.GroupCode1 = 'W' then 'Worker' when a.GroupCode1 = 'N' then 'Normal Employee' else a.GroupCode1 end as GroupCode1 , a.Education , a.IsManger , a.ManagerID , isnull((select sum(SalaryAmount) from EmployeeSalary x where x.EmployeeID = a.EmployeeID), 0) as SalaryAmount , 'https://res.cloudinary.com/dl3ea3yw2/image/upload/v1782305881/HRImages/' +  convert ( nvarchar , a.ImageID  ) +'-0.jpg' as ImagePhoto,
               a.Birthdate, a.Tel, a.Mob
        from PFX.HR0010 a 
        where a.EmployeeID = @EmployeeID;

        -- 2. Termination Details
        select EmployeeID , TerminationDate , TerminationNote  
        from EmployeeTerminationHistory 
        where TerminationState=20 and EmployeeID = @EmployeeID;

        -- 3. Salary Details
        select a.EmployeeID , a.SalaryAmount , b.SalaryName   
        from EmployeeSalary a 
        left outer join SalaryMaster b on a.SalaryID=b.SalaryID 
        where a.EmployeeID = @EmployeeID;

        -- 4. KPI Details
        select Top(4) a.EmployeeID , a.EvaluationYear , a.EvaluationQuarter , b.KPIDescription , a.TargetScore , a.AchievedScore  , EvaluateBy
        from KPIEvaluationEmployee a 
        left outer join KPIMaster b on a.KPIID=b.KPIID
        where a.RecordState=30 and a.EmployeeID = @EmployeeID
        order by a.EvaluationYear desc, a.EvaluationQuarter desc;

        -- 5. Leave Balance Details
        select a.EmployeeID , a.BalanceYear , b.LeaveName , ( a.OpenBalance - a.Issued - a.ApproveNeeded + a.Adjustments ) as balance  
        from LeaveBalance a 
        left outer join LeaveMaster b on a.LeaveMasterID=b.LeaveID 
        where a.BalanceYear=2026 and a.EmployeeID = @EmployeeID;
    END
    ELSE IF @Operation = 'Get Leaves and Missions Today'
    BEGIN
        select a.EmployeeID, 
               c.Fullname, 
               c.DepartmentName, 
               c.BranchName, 
               c.JobName, 
               b.LeaveName, 
               isnull(b.IsBusinessLeave, 0) as IsBusinessLeave,
               'https://res.cloudinary.com/dl3ea3yw2/image/upload/v1782305881/HRImages/' + convert(nvarchar, c.ImageID) + '-0.jpg' as ImagePhoto,
               isnull((select (lb.OpenBalance - lb.Issued - lb.ApproveNeeded + lb.Adjustments) 
                       from LeaveBalance lb 
                       where lb.EmployeeID = a.EmployeeID 
                         and lb.LeaveMasterID = b.LeaveID 
                         and lb.BalanceYear = year(getdate())), 0) as LeaveBalance
        from LeaveHistory a 
        left outer join LeaveMaster b on a.LeaveID=b.LeaveID 
        join PFX.HR0010 c on a.EmployeeID = c.EmployeeID
        WHERE a.LeaveDate = CONVERT(DATE, GETDATE()) 
          and b.LeaveType = 2 
          and ltrim(rtrim(c.GroupCode1)) in ('W', 'N')
        order by b.IsBusinessLeave, c.Fullname;
    END
    ELSE
    BEGIN
        -- Default: Dashboard Data
        -- 1. Employees List
        select EmployeeID ,   Fullname , BranchName , DepartmentName , DivisionName , JobName , ( select FullName from EmployeeMaster x where x.EmployeeID=a.ReportTo ) as ReportingTo , a.JoiningDate , Address , ContractDate , ContractExpiredDate , a.StateDescription as EmployeeCurrentStauts , LeavingDate , TerminationNotes , case when a.GroupCode1 = 'W' then 'Worker' when a.GroupCode1 = 'N' then 'Normal Employee' else a.GroupCode1 end as GroupCode1 , a.Education , a.IsManger , a.ManagerID , isnull((select sum(SalaryAmount) from EmployeeSalary x where x.EmployeeID = a.EmployeeID), 0) as SalaryAmount , 'https://res.cloudinary.com/dl3ea3yw2/image/upload/v1782305881/HRImages/' +  convert ( nvarchar , a.ImageID  ) +'-0.jpg' as ImagePhoto,
               a.Birthdate, a.Tel, a.Mob
        from PFX.HR0010 a
        where ltrim(rtrim(a.StateDescription)) = 'Working' or a.EmployeeID in (select EmployeeID from EmployeeTerminationHistory where TerminationState = 20 and year(TerminationDate) = year(getdate()))
        order by a.ManagerID, case when a.IsManger = 1 then 0 else 1 end, a.Fullname;

        -- 2. Summary KPI Metrics
        DECLARE @ActiveWorkerNormal INT = 0;
        select @ActiveWorkerNormal = count(*) 
        from PFX.HR0010 
        where ltrim(rtrim(StateDescription)) = 'Working' and ltrim(rtrim(GroupCode1)) in ('W', 'N');

        DECLARE @TerminationsThisYear INT = 0;
        select @TerminationsThisYear = count(*) 
        from EmployeeTerminationHistory 
        where TerminationState = 20 and year(TerminationDate) = year(getdate());

        DECLARE @JoinedThisYear INT = 0;
        select @JoinedThisYear = count(*) 
        from PFX.HR0010 
        where year(JoiningDate) = year(getdate());

        DECLARE @TotalSalary DECIMAL(18,2) = 0;
        select @TotalSalary = sum(a.SalaryAmount) 
        from EmployeeSalary a 
        join PFX.HR0010 b on a.EmployeeID = b.EmployeeID 
        where ltrim(rtrim(b.StateDescription)) = 'Working';

        DECLARE @TurnoverRate DECIMAL(5,2) = 0;
        select @TurnoverRate = cast((cast(@TerminationsThisYear as float) / nullif(@ActiveWorkerNormal, 0)) * 100 as decimal(5, 2));

        DECLARE @LeavesToday INT = 0;
        select @LeavesToday = count(distinct a.EmployeeID) 
        from LeaveHistory a 
        left outer join LeaveMaster b on a.LeaveID=b.LeaveID 
        join PFX.HR0010 c on a.EmployeeID = c.EmployeeID
        WHERE a.LeaveDate = CONVERT(DATE, GETDATE()) 
          and b.LeaveType = 2 
          and isnull(b.IsBusinessLeave, 0) <> 1
          and ltrim(rtrim(c.GroupCode1)) in ('W', 'N');

        DECLARE @MissionsToday INT = 0;
        select @MissionsToday = count(distinct a.EmployeeID) 
        from LeaveHistory a 
        left outer join LeaveMaster b on a.LeaveID=b.LeaveID 
        join PFX.HR0010 c on a.EmployeeID = c.EmployeeID
        WHERE a.LeaveDate = CONVERT(DATE, GETDATE()) 
          and b.LeaveType = 2 
          and isnull(b.IsBusinessLeave, 0) = 1
          and ltrim(rtrim(c.GroupCode1)) in ('W', 'N');

        select 
            isnull(@ActiveWorkerNormal, 0) as ActiveWorkerNormal,
            isnull(@TerminationsThisYear, 0) as TerminationsThisYear,
            isnull(@TotalSalary, 0) as TotalSalary,
            isnull(@TurnoverRate, 0) as TurnoverRate,
            isnull(@JoinedThisYear, 0) as JoinedThisYear,
            isnull(@LeavesToday, 0) as LeavesToday,
            isnull(@MissionsToday, 0) as MissionsToday;
    END
end
GO
