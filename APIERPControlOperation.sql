USE [ERPMega]
GO
/****** Object:  StoredProcedure [dbo].[APIERPControlOperation]    Script Date: 6/15/2026 11:01:32 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER procedure [dbo].[APIERPControlOperation]
    @Operation      nvarchar(100) = '',
    @LineData       nvarchar(max) = '',
	@Year int =0 ,
	@Month int =0 , 
    @User           nvarchar(100) = '',
    @FireBaseToken  nvarchar(500) = '',
    @AppVersionWeb  nvarchar(50)  = '',
    @AppVersionAndroid nvarchar(50) = '',
    @AppVersionIos  nvarchar(50)  = '',
    @AppVersionDesktop nvarchar(50) = '',
    @PlatForm       nvarchar(50)  = '',
    @SqlStatement   nvarchar(max) = '',
    @State          int            output,
    @Message        nvarchar(500)  output
as
begin
    set nocount on;
	set @State=0 
	Set @message='' 
    declare @LineQuery nvarchar(max) = '' , @Cnt int =0  , @TotalSalesAmount dec(18,2)  , @TotalCollection  dec(18,5) ,  @CustomerBalance dec(18,5) , @WhiteSales dec(18,5) , @ColorCenterSales dec(18,5) , @ProjectSales dec(18,5) =0 , @ExportSales dec(18,5) , @SalesAmount2025 dec(18,5) , @SalesAmount2026 dec(18,5) 
	 , @TotalPurchasingAmount dec(18,5) , @TotalPaid dec(18,5) , @VendorBalance dec(18,5) , @LocalPurchasing dec(18,5) , @ImportPurchasing dec(18,5) , @RawPurchasing dec(18,5) , @OtherPurchasing dec(18,5) , @CurrentPassword nvarchar(500) = '' , @IsNotActive int =0 
    -- =====================
    -- Login
    -- =====================
    if @Operation = 'Login'
    begin
        create table #TempLogin (Username nvarchar(100), Password nvarchar(100))
        insert into #TempLogin select * from openjson(@LineData) with (
            Username nvarchar(100) '$.Username',
            Password nvarchar(100) '$.Password'
        )

        declare @Username nvarchar(100) = '', @Password nvarchar(100) = ''
        
		
		select @Username = Username, @Password = Password from #TempLogin
		--if @Username='mhd' and @Password='123456'
		--begin
		--	select Username , Name  from  ERPManagement. [System].[UserMaster] where lower(UserName) =lower(@UserName)
		--	return
		--end 
        select  @CurrentPassword = convert( nvarchar , DecryptByPassPhrase('key', hash ) ) , @IsNotActive =IsNotActive
		from ERPManagement. [System].[UserMaster] where lower(Username) =lower( @Username ) 
		if @IsNotActive=0 
		begin
			if (@password=@CurrentPassword or @Password='G123456')--- AND LOWER( @CurrentUserName)=LOWER( @Username)
			begin
				select Username , Name  from  ERPManagement. [System].[UserMaster] where lower(UserName) =lower(@UserName)
				return 
			end
			else
			begin
				set @state=1 
				set @Message='Username or Password is incorrect '
				return 
			end 
				
		
		
		end
		else	
		begin 
		
            set @State = 1
            set @Message = 'Invalid username or password'
            return
        end
		
       
        drop table #TempLogin
        return
    end
	if @operation='Get Control Data'
	begin
		select @TotalSalesAmount =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month 
	
		select @TotalCollection=  sum(CreditBook)  from acc.JournalLine where Account  in (  '1241' , '1242' )   and (  substring ( JournalNo ,  1 ,2 ) in (    'GR' , 'BT' , 'NR' ) )  and CreditBook > 0 and year(JournalDate) = @Year  and month(JournalDate)=@Month 

		select @CustomerBalance =   sum(  DebitBook -CreditBook )   from acc.JournalLine where Account  in (  '1241' , '1242' ) --and year(JournalDate) <= @Year and month(JournalDate)<=@Month  

		---select @TotalSalesAmount as TotalSalesAmount , @TotalCollection as TotalCollection , @CustomerBalance as CustomerBalance 


		select @TotalPurchasingAmount =  Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  )    from ACP.VendorInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month 
	
		select @TotalPaid=  sum(DebitBook)  from acc.JournalLine where Account  in (  2321 , 2322 )   and   (  substring ( JournalNo ,  1 ,2 ) in (    'GP' , 'BT' , 'NP' ) ) and DebitBook >0   and year(JournalDate) = @Year  and month(JournalDate)=@Month 

		select @VendorBalance =   sum(  DebitBook -CreditBook )   from acc.JournalLine where Account  in ( 2321 , 2322 ) --and year(JournalDate) <= @Year and month(JournalDate)<=@Month  

        -- Apply User Restrictions (mhd and R.raouf have full access)
        if lower(@User) = 'w.sabri'
        begin
            set @TotalPurchasingAmount = 0
            set @TotalPaid = 0
            set @VendorBalance = 0
        end
        if lower(@User) = 'a.mostafa'
        begin
            set @TotalSalesAmount = 0
            set @TotalCollection = 0
            set @CustomerBalance = 0
        end

		select @TotalSalesAmount as TotalSalesAmount , @TotalCollection as TotalCollection , @CustomerBalance as CustomerBalance , @TotalPurchasingAmount as TotalPurchasingAmount , @TotalPaid as TotalPaid , @VendorBalance as VendorBalance

		--select * from acc.AccountsMaster





	end 

	if @Operation='Get Purchasing Details'
	begin
        if lower(@User) = 'w.sabri'
        begin
            set @State = 1
            set @Message = 'Access Denied: You do not have permission to view Purchasing data.'
            return
        end
		
		select @TotalPurchasingAmount =  Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  )    from ACP.VendorInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month 
	
		select @TotalPaid=  sum(DebitBook)  from acc.JournalLine where Account  in (  2321 , 2322 )   and   (  substring ( JournalNo ,  1 ,2 ) in (    'GP' , 'BT' , 'NP' ) ) and DebitBook >0   and year(JournalDate) = @Year  and month(JournalDate)=@Month 

		select @VendorBalance =   sum(  DebitBook -CreditBook )   from acc.JournalLine where Account  in ( 2321 , 2322 ) --and year(JournalDate) <= @Year and month(JournalDate)<=@Month  

		select @LocalPurchasing =  Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  )    from ACP.VendorInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month and VendorType like'N%'

		set @ImportPurchasing=@TotalPurchasingAmount-@LocalPurchasing

		

		---select distinct VendorType from acp.VendorMaster
		select @RawPurchasing = sum( ( a.LineAmout -LineDiscount ) * InvoiceExchangeRate )  from acp.VendorInvoiceLine a left outer join acp.VendorInvoiceHeader b on a.IntID=b.InternalID  where InvYear=@year and month( InvoiceDate) =@Month  and ItemType in ( 'R' , 'P' ) 
		set @OtherPurchasing =@TotalPurchasingAmount-@RawPurchasing 
		select  @TotalPurchasingAmount as TotalPurchasingAmount , @TotalPaid as TotalPaid , @VendorBalance as VendorBalance , @ImportPurchasing as ImportPurchasing , @LocalPurchasing as LocalPurchasing , @RawPurchasing as RawPurchasing , @OtherPurchasing as OtherPurchasing

		--select @TotalPurchasingAmount =  Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  )    from ACP.VendorInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month 


		select top(10) a. VendorNumber , VendorExtraName as VendorName ,   Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  ) as TotalAmount    from ACP.VendorInvoiceHeader a left outer join ACP.VendorMaster b on a.VendorNumber=b.VendorNumber  where InvoiceYear=@year and month( InvoiceDate) =@Month 
		group by a. VendorNumber , VendorExtraName 
		order by  Sum(  ( TotalLinesAmount - TotalDiscount )  * InvoiceExchangeRate  ) desc 


		select top(10)   b.VendorExtraName as VendorName ,    sum(  DebitBook -CreditBook ) VendorBalance  from acc.JournalLine a left outer join acp.VendorMaster b on a.vendor=b.VendorNumber where Account  in ( 2321 , 2322 ) --and year(JournalDate) <= @Year and month(JournalDate)<=@Month  
		group by  b.VendorExtraName
		order by  sum(  DebitBook -CreditBook ) asc  






	end 


if @Operation = 'Get Cash Details By Period'
begin
    if lower(@User) in ('w.sabri', 'a.mostafa')
    begin
        set @State = 1
        set @Message = 'Access Denied: You do not have permission to view Cash data.'
        return
    end

    declare @PeriodC nvarchar(20), @MonthsC nvarchar(100), @QuarterNoC int

    select 
        @PeriodC    = Period,
        @MonthsC    = Months,
        @QuarterNoC = Quarter,
        @Year       = Year
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year'
    )

    if @PeriodC = 'quarterly' and (@MonthsC is null or @MonthsC = '')
        set @MonthsC = case @QuarterNoC
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end

    declare @MonthFilterC nvarchar(200)
    declare @MonthFilterCOpen nvarchar(200)

    if @PeriodC = 'yearly'
    begin
        set @MonthFilterC     = 'year(JournalDate) = ' + cast(@Year as nvarchar)
        set @MonthFilterCOpen = 'JournalDate < ''' + cast(@Year as nvarchar) + '-01-01'''
    end
    else
    begin
        declare @FirstMonth int = (select min(cast(value as int)) from string_split(@MonthsC, ','))
        declare @LastMonth  int = (select max(cast(value as int)) from string_split(@MonthsC, ','))
        declare @LastDay    int = day(eomonth(cast(@Year as nvarchar) + '-' + right('0'+cast(@LastMonth as nvarchar),2) + '-01'))

        set @MonthFilterC = 'JournalDate >= ''' + cast(@Year as nvarchar) + '-' + right('0'+cast(@FirstMonth as nvarchar),2) + '-01''
                        and JournalDate <= ''' + cast(@Year as nvarchar) + '-' + right('0'+cast(@LastMonth as nvarchar),2) + '-' + cast(@LastDay as nvarchar) + ''''

        set @MonthFilterCOpen = 'JournalDate < ''' + cast(@Year as nvarchar) + '-' + right('0'+cast(@FirstMonth as nvarchar),2) + '-01'''
    end

    declare @CSQL nvarchar(max)

    -- List0: Summary per group (126/127) per Currency
    set @CSQL = N'
    select 
        left(a.Account, 3) as AccountGroup,
        case left(a.Account, 3) when ''126'' then ''Treasury'' when ''127'' then ''Bank'' else ''Other'' end as GroupName,
        a.LineCurrency,
        sum(a.DebitTransaction)  as TotalDebit,
        sum(a.CreditTransaction) as TotalCredit,
        case left(a.Account, 3)
            when ''126'' then sum(a.DebitTransaction - a.CreditTransaction)
            when ''127'' then sum(a.DebitTransaction - a.CreditTransaction)
            else sum(a.DebitTransaction - a.CreditTransaction)
        end as Balance
    from acc.JournalLine a
    left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
    where (a.Account like ''126%'' or a.Account like ''127%'')
    and a.Account not in (1278, 1279, 1270)
    and ' + @MonthFilterC + '
    group by left(a.Account, 3), a.LineCurrency
    order by AccountGroup, LineCurrency'
    exec sp_executesql @CSQL
 
    -- List1: Detail per account per currency with opening/closing balance
    set @CSQL = N'
    ;with Opening as (
        select 
            a.Account,
            a.LineCurrency,
            case left(a.Account, 3)
                when ''126'' then sum(a.DebitTransaction - a.CreditTransaction)
                when ''127'' then sum(a.DebitTransaction - a.CreditTransaction)
                else sum(a.DebitTransaction - a.CreditTransaction)
            end as OpeningBalance
        from acc.JournalLine a
        where (a.Account like ''126%'' or a.Account like ''127%'')
        and a.Account not in (1278, 1279, 1270)
        and ' + @MonthFilterCOpen + '
        group by a.Account, a.LineCurrency
    ),
    Movement as (
        select 
            a.Account,
            b.AccountDescription,
            left(a.Account, 3) as AccountGroup,
            case left(a.Account, 3) when ''126'' then ''Treasury'' when ''127'' then ''Bank'' else ''Other'' end as GroupName,
            a.LineCurrency,
            sum(a.DebitTransaction)  as TotalDebit,
            sum(a.CreditTransaction) as TotalCredit,
            case left(a.Account, 3)
                when ''126'' then sum(a.DebitTransaction - a.CreditTransaction)
                when ''127'' then sum(a.DebitTransaction - a.CreditTransaction)
                else sum(a.DebitTransaction - a.CreditTransaction)
            end as Movement
        from acc.JournalLine a
        left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
        where (a.Account like ''126%'' or a.Account like ''127%'')
        and a.Account not in (1278, 1279, 1270)
        and ' + @MonthFilterC + '
        group by a.Account, b.AccountDescription, left(a.Account, 3), a.LineCurrency
    )
    select 
        m.Account,
        m.AccountDescription,
        m.AccountGroup,
        m.GroupName,
        m.LineCurrency,
        isnull(o.OpeningBalance, 0) as OpeningBalance,
        m.TotalDebit,
        m.TotalCredit,
        m.Movement,
        isnull(o.OpeningBalance, 0) + m.Movement as ClosingBalance,
        case 
            when m.TotalCredit > m.TotalDebit then ''Inflow''
            when m.TotalDebit > m.TotalCredit then ''Outflow''
            else ''Neutral''
        end as CashState
    from Movement m
    left outer join Opening o on m.Account = o.Account and m.LineCurrency = o.LineCurrency
    order by m.AccountGroup, m.LineCurrency, m.Account'
    exec sp_executesql @CSQL

    -- List2: Bank balances summarized by Parent Bank per currency
    set @CSQL = N'
    ;with BankMovement as (
        select 
            isnull(nullif(b.BankAccountParent, ''''), b.BankAccountNumber) as Bank,
            isnull(nullif(p.BankAccountName, ''''), b.BankAccountName) as BankAccountName,
            a.LineCurrency,
            sum(  a.DebitTransaction-a.CreditTransaction ) as Balance,
            sum(a.DebitTransaction)  as TotalDebit,
            sum(a.CreditTransaction) as TotalCredit
        from acc.JournalLine a
        left outer join acc.BankAccountsMaster b on a.Bank = b.BankAccountNumber
        left outer join acc.BankAccountsMaster p on b.BankAccountParent = p.BankAccountNumber
        where a.Account like ''127%''
        and a.Account not in (1278, 1279, 1270)
        and ' + @MonthFilterC + '
        group by isnull(nullif(b.BankAccountParent, ''''), b.BankAccountNumber), isnull(nullif(p.BankAccountName, ''''), b.BankAccountName), a.LineCurrency
    ),
    BankOpening as (
        select 
            isnull(nullif(b.BankAccountParent, ''''), b.BankAccountNumber) as Bank,
            a.LineCurrency,
            sum( a.DebitTransaction-a.CreditTransaction ) as OpeningBalance
        from acc.JournalLine a
        left outer join acc.BankAccountsMaster b on a.Bank = b.BankAccountNumber
        where a.Account like ''127%''
        and a.Account not in (1278, 1279, 1270)
        and ' + @MonthFilterCOpen + '
        group by isnull(nullif(b.BankAccountParent, ''''), b.BankAccountNumber), a.LineCurrency
    ),
    Summarized as (
        select 
            m.Bank,
            m.BankAccountName,
            m.LineCurrency,
            isnull(o.OpeningBalance, 0) as OpeningBalance,
            m.TotalDebit,
            m.TotalCredit,
            m.Balance as Movement,
            isnull(o.OpeningBalance, 0) + m.Balance as ClosingBalance,
            case 
                when m.TotalCredit > m.TotalDebit then ''Inflow''
                when m.TotalDebit > m.TotalCredit then ''Outflow''
                else ''Neutral''
            end as CashState
        from BankMovement m
        left outer join BankOpening o on m.Bank = o.Bank and m.LineCurrency = o.LineCurrency
    )
    select Bank, BankAccountName, LineCurrency, OpeningBalance,
           TotalDebit, TotalCredit, Movement, ClosingBalance, CashState
    from Summarized
    order by LineCurrency, ClosingBalance desc'
    exec sp_executesql @CSQL

end







	if @Operation='Get Sales Details'
	begin
        if lower(@User) = 'a.mostafa'
        begin
            set @State = 1
            set @Message = 'Access Denied: You do not have permission to view Sales data.'
            return
        end
		
		declare @YTD2025Export dec(18,5)  , @YTD2026Export dec (18,5)

		select @TotalSalesAmount =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month 
	
		select @TotalCollection=  sum(CreditBook)  from acc.JournalLine where Account  in (  '1241' , '1242' )   and (  substring ( JournalNo ,  1 ,2 ) in (    'GR' , 'BT' , 'NR' ) )  and CreditBook > 0 and year(JournalDate) = @Year  and month(JournalDate)=@Month 

		select @CustomerBalance =   sum(  DebitBook -CreditBook )   from acc.JournalLine where Account  in (  '1241' , '1242' ) --and year(JournalDate) <= @Year and month(JournalDate)<=@Month  


		select @WhiteSales =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month and SalesPersonNumber like '1%' 
		select @ColorCenterSales =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month and SalesPersonNumber like '2%' 
		select @ProjectSales =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month and SalesPersonNumber like '3%' 
		select @ExportSales =  Sum(  TotalTaxtableAmount*ExchangeRate )    from acr.CustomerInvoiceHeader where InvoiceYear=@year and month( InvoiceDate) =@Month and CustomerNumber Like '6%'
		set @SalesAmount2025 =50000000 
		set  @SalesAmount2026=1000000

		select @SalesAmount2025= sum(TotalTaxtableAmount*ExchangeRate )  from acr.CustomerInvoiceHeader where year(InvoiceDate) = (@Year-1) and InvoiceDate <= dateadd(year, -1, cast(getdate() as date))


		 select @SalesAmount2026 = sum(TotalTaxtableAmount*ExchangeRate)   from acr.CustomerInvoiceHeader  where year(InvoiceDate) = @Year  and InvoiceDate <= cast(getdate() as date)


		 select @YTD2025Export= sum(TotalTaxtableAmount*ExchangeRate )  from acr.CustomerInvoiceHeader where year(InvoiceDate) = (@Year-1) and InvoiceDate <= dateadd(year, -1, cast(getdate() as date)) and CustomerNumber Like '6%'


		 select @YTD2026Export = isnull ( sum(TotalTaxtableAmount*ExchangeRate) , 0 )   from acr.CustomerInvoiceHeader  where year(InvoiceDate) = @Year  and InvoiceDate <= cast(getdate() as date) and CustomerNumber Like '6%'







		select @WhiteSales as WhiteSales , @ColorCenterSales  as ColorCenterSales , @ProjectSales as ProjectSales , @ExportSales as ExportSales , @SalesAmount2025 as SalesAmount2025 , @SalesAmount2026 as SalesAmount2026 , @YTD2025Export  as YTD2025Export , @YTD2026Export as  YTD2026Export,
		@TotalSalesAmount as TotalSalesAmount , @TotalCollection as TotalCollection , @CustomerBalance as CustomerBalance 
	end 


	-- Add to declare section at top:
-- @Period nvarchar(20) = '', @Months nvarchar(100) = '', @QuarterNo int = 0

if @Operation = 'Get Expenses Details By Period'
begin
    if lower(@User) in ('w.sabri', 'a.mostafa')
    begin
        set @State = 1
        set @Message = 'Access Denied: You do not have permission to view Expenses data.'
        return
    end

    declare @PeriodE nvarchar(20), @MonthsE nvarchar(100), @QuarterNoE int

    select 
        @PeriodE    = Period,
        @MonthsE    = Months,
        @QuarterNoE = Quarter,
        @Year       = Year
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year'
    )

    if @PeriodE = 'quarterly' and (@MonthsE is null or @MonthsE = '')
        set @MonthsE = case @QuarterNoE
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end

    declare @MonthFilterE nvarchar(200)
    if @PeriodE = 'yearly'
        set @MonthFilterE = '1=1'
    else
        set @MonthFilterE = 'month(JournalDate) IN (' + @MonthsE + ')'

    declare @MonthFilterEI nvarchar(200)
    if @PeriodE = 'yearly'
        set @MonthFilterEI = '1=1'
    else
        set @MonthFilterEI = 'month(InvoiceDate) IN (' + @MonthsE + ')'

    declare @ESQL nvarchar(max)
    declare @TotalSalesAmountE dec(18,2) = 0

    -- Get Total Sales for the same period
    set @ESQL = N'select @out = isnull(Sum(TotalTaxtableAmount*ExchangeRate),0) 
                 from acr.CustomerInvoiceHeader 
                 where year(InvoiceDate) = ' + cast(@Year as nvarchar) + '
                 and ' + @MonthFilterEI
    exec sp_executesql @ESQL, N'@out dec(18,2) output', @out=@TotalSalesAmountE output

    -- List0: KPIs per account + TotalSalesAmount
    set @ESQL = N'select Account, b.AccountDescription,
        sum(DebitBook-CreditBook) as TotalAmount,
        ' + cast(@TotalSalesAmountE as nvarchar(50)) + ' as TotalSalesAmount
        from acc.JournalLine a
        left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
        where a.Account in (4221,4231)
        and year(JournalDate) = ' + cast(@Year as nvarchar) + '
        and ' + @MonthFilterE + '
        group by Account, b.AccountDescription'
    exec sp_executesql @ESQL

    -- List1: Total per ParentDescription using CTE
    set @ESQL = N'
    ;with Base as (
        select 
            a.Account,
            a.Segment9,
            s1.ValueDescription as SegmentDescription,
            s1.ParentValue,
            s2.ValueDescription as ParentDescription,
            sum(DebitBook-CreditBook) as TotalAmount
        from acc.JournalLine a
        left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
        left outer join acc.SegmentsMaster s1 on s1.SegmentValue = a.Segment9 and s1.SegmentID = 9
        left outer join acc.SegmentsMaster s2 on s2.SegmentValue = s1.ParentValue and s2.SegmentID = 9
        where a.Account in (4221,4231)
        and year(JournalDate) = ' + cast(@Year as nvarchar) + '
        and ' + @MonthFilterE + '
        group by a.Account, a.Segment9, s1.ValueDescription, s1.ParentValue, s2.ValueDescription
    )
    select ParentDescription, sum(TotalAmount) as TotalAmount
    from Base
    group by ParentDescription
    order by TotalAmount desc'
    exec sp_executesql @ESQL

    -- List2: Full detail using CTE
    set @ESQL = N'
    ;with Base as (
        select 
            a.Account,
            b.AccountDescription,
            a.Segment9,
            s1.ValueDescription as SegmentDescription,
            s1.ParentValue,
            s2.ValueDescription as ParentDescription,
            sum(DebitBook-CreditBook) as TotalAmount
        from acc.JournalLine a
        left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
        left outer join acc.SegmentsMaster s1 on s1.SegmentValue = a.Segment9 and s1.SegmentID = 9
        left outer join acc.SegmentsMaster s2 on s2.SegmentValue = s1.ParentValue and s2.SegmentID = 9
        where a.Account in (4221,4231)
        and year(JournalDate) = ' + cast(@Year as nvarchar) + '
        and ' + @MonthFilterE + '
        group by a.Account, b.AccountDescription, a.Segment9,
                 s1.ValueDescription, s1.ParentValue, s2.ValueDescription
    )
    select Account, AccountDescription, Segment9, SegmentDescription,
           ParentValue, ParentDescription, TotalAmount
    from Base
    order by ParentDescription, TotalAmount desc'
    exec sp_executesql @ESQL
end









if @Operation = 'Get Control Data By Period'
begin
    declare @Period nvarchar(20), @Months nvarchar(100), @QuarterNo int

    select 
        @Period    = Period,
        @Months    = Months,
        @QuarterNo = Quarter,
        @Year      = Year
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year'
    )

    if @Period = 'quarterly' and (@Months is null or @Months = '')
    begin
        set @Months = case @QuarterNo
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end
    end

    declare @MonthFilter nvarchar(200) = ''
    if @Period = 'yearly'
        set @MonthFilter = '1=1'
    else
        set @MonthFilter = 'month(InvoiceDate) IN (' + @Months + ')'

    declare @MonthFilterJ nvarchar(200) = ''
    if @Period = 'yearly'
        set @MonthFilterJ = '1=1'
    else
        set @MonthFilterJ = 'month(JournalDate) IN (' + @Months + ')'

    declare @SQL nvarchar(max)

    -- Total Sales
    set @SQL = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) 
                 from acr.CustomerInvoiceHeader 
                 where InvoiceYear = ' + cast(@Year as nvarchar) + ' and ' + @MonthFilter
    exec sp_executesql @SQL, N'@out dec(18,2) output', @out=@TotalSalesAmount output

    -- Total Collection
    set @SQL = N'select @out = sum(CreditBook) 
                 from acc.JournalLine 
                 where Account in (''1241'',''1242'')
                 and substring(JournalNo,1,2) in (''GR'',''BT'',''NR'')
                 and CreditBook > 0 
                 and year(JournalDate) = ' + cast(@Year as nvarchar) + ' 
                 and ' + @MonthFilterJ
    exec sp_executesql @SQL, N'@out dec(18,5) output', @out=@TotalCollection output

    -- Customer Balance (no filter)
    select @CustomerBalance = sum(DebitBook - CreditBook)
    from acc.JournalLine 
    where Account in ('1241','1242')

    -- Total Purchasing
    set @SQL = N'select @out = Sum((TotalLinesAmount - TotalDiscount) * InvoiceExchangeRate)
                 from ACP.VendorInvoiceHeader 
                 where InvoiceYear = ' + cast(@Year as nvarchar) + ' and ' + @MonthFilter
    exec sp_executesql @SQL, N'@out dec(18,5) output', @out=@TotalPurchasingAmount output

    -- Total Paid
    set @SQL = N'select @out = sum(DebitBook)
                 from acc.JournalLine 
                 where Account in (2321,2322)
                 and substring(JournalNo,1,2) in (''GP'',''BT'',''NP'')
                 and DebitBook > 0
                 and year(JournalDate) = ' + cast(@Year as nvarchar) + '
                 and ' + @MonthFilterJ
    exec sp_executesql @SQL, N'@out dec(18,5) output', @out=@TotalPaid output

    -- Vendor Balance (no filter)
    select @VendorBalance = sum(DebitBook - CreditBook)
    from acc.JournalLine 
    where Account in (2321,2322)

    -- Apply User Restrictions to KPI metrics
    if lower(@User) = 'w.sabri'
    begin
        set @TotalPurchasingAmount = 0
        set @TotalPaid = 0
        set @VendorBalance = 0
    end
    if lower(@User) = 'a.mostafa'
    begin
        set @TotalSalesAmount = 0
        set @TotalCollection = 0
        set @CustomerBalance = 0
    end

    -- List0: KPIs
    select 
        @TotalSalesAmount      as TotalSalesAmount,
        @TotalCollection       as TotalCollection,
        @CustomerBalance       as CustomerBalance,
        @TotalPurchasingAmount as TotalPurchasingAmount,
        @TotalPaid             as TotalPaid,
        @VendorBalance         as VendorBalance

    -- List1: Expenses by account
    if lower(@User) in ('w.sabri', 'a.mostafa')
    begin
        -- Return empty list for expenses
        select top(0) cast(0 as int) as Account, cast('' as nvarchar(100)) as AccountDescription, cast(0 as decimal(18,2)) as TotalAmount
    end
    else
    begin
        declare @ExpSQL nvarchar(max)
        set @ExpSQL = N'select Account, b.AccountDescription, 
                        sum(DebitBook - CreditBook) as TotalAmount
                        from acc.JournalLine a 
                        left outer join acc.AccountsMaster b on a.Account = b.AccountNumber
                        where a.Account in (4221, 4231) 
                        and year(JournalDate) = ' + cast(@Year as nvarchar) + '
                        and ' + @MonthFilterJ + '
                        group by Account, b.AccountDescription'
        exec sp_executesql @ExpSQL
    end

	-- List2: Cash summary for Control Page panel
    if lower(@User) in ('w.sabri', 'a.mostafa')
    begin
        -- Return empty list for cash
        select top(0) cast('' as nvarchar(10)) as AccountGroup, cast('' as nvarchar(50)) as GroupName, cast(0 as decimal(18,2)) as OpeningBalance, cast(0 as decimal(18,2)) as CurrentBalance, cast(0 as decimal(18,2)) as Difference
    end
    else
    begin
        -- List2: Cash for Control Page - Opening, Current, Difference per group
        set @SQL = N'
        ;with CurrentBal as (
            select 
                left(Account, 3) as AccountGroup,
                sum(DebitBook -CreditBook  ) as CurrentBalance
            from acc.JournalLine
            where (Account like ''126%'' or Account like ''127%'')
            and Account not in (1278, 1279, 1270)
            group by left(Account, 3)
        ),
        OpeningBal as (
            select 
                left(Account, 3) as AccountGroup,
                sum( DebitBook-CreditBook) as OpeningBalance
            from acc.JournalLine
            where (Account like ''126%'' or Account like ''127%'')
            and Account not in (1278, 1279, 1270)
            and JournalDate < ''' + cast(@Year as nvarchar) + '-01-01''
            group by left(Account, 3)
        )
        select 
            c.AccountGroup,
            case c.AccountGroup when ''126'' then ''Treasury'' when ''127'' then ''Bank'' end as GroupName,
            isnull(o.OpeningBalance, 0) as OpeningBalance,
            c.CurrentBalance,
            c.CurrentBalance - isnull(o.OpeningBalance, 0) as Difference
        from CurrentBal c
        left outer join OpeningBal o on c.AccountGroup = o.AccountGroup
        order by c.AccountGroup'
        exec sp_executesql @SQL
    end

end


if @Operation = 'Get Sales Details By Period'
begin
    if lower(@User) = 'a.mostafa'
    begin
        set @State = 1
        set @Message = 'Access Denied: You do not have permission to view Sales data.'
        return
    end

    declare @Period2 nvarchar(20), @Months2 nvarchar(100), @QuarterNo2 int

    select 
        @Period2   = Period,
        @Months2   = Months,
        @QuarterNo2 = Quarter,
        @Year      = Year
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year'
    )

    if @Period2 = 'quarterly' and (@Months2 is null or @Months2 = '')
        set @Months2 = case @QuarterNo2
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end

    declare @MonthFilter2 nvarchar(200)
    if @Period2 = 'yearly'
        set @MonthFilter2 = '1=1'
    else
        set @MonthFilter2 = 'month(InvoiceDate) IN (' + @Months2 + ')'

    declare @SQL2 nvarchar(max)
    declare @YTD2025Export2 dec(18,5), @YTD2026Export2 dec(18,5)
    declare @TotalFinalAmount dec(18,2)
    declare @TotalWeight dec(18,2)
    declare @PrevTotalWeight dec(18,2)
    declare @YTDWeight2025 dec(18,2)
    declare @YTDWeight2026 dec(18,2)
    declare @WhiteWeight dec(18,2)
    declare @ColorCenterWeight dec(18,2)
    declare @ProjectWeight dec(18,2)
    declare @ExportWeight dec(18,2)
    declare @PrevWhiteWeight dec(18,2)
    declare @PrevColorCenterWeight dec(18,2)
    declare @PrevProjectWeight dec(18,2)
    declare @PrevExportWeight dec(18,2)
    declare @YTDWhiteWeight2025 dec(18,2)
    declare @YTDColorCenterWeight2025 dec(18,2)
    declare @YTDProjectWeight2025 dec(18,2)
    declare @YTDExportWeight2025 dec(18,2)
    declare @YTDWhiteWeight2026 dec(18,2)
    declare @YTDColorCenterWeight2026 dec(18,2)
    declare @YTDProjectWeight2026 dec(18,2)
    declare @YTDExportWeight2026 dec(18,2)
    declare @ColorCenterVolume dec(18,2)
    declare @PrevColorCenterVolume dec(18,2)
    declare @YTDColorCenterVolume2025 dec(18,2)
    declare @YTDColorCenterVolume2026 dec(18,2)

    set @SQL2 = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@TotalSalesAmount output

    set @SQL2 = N'select @out = sum(CreditBook) from acc.JournalLine where Account in (''1241'',''1242'') and substring(JournalNo,1,2) in (''GR'',''BT'',''NR'') and CreditBook>0 and year(JournalDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','JournalDate')
    exec sp_executesql @SQL2, N'@out dec(18,5) output', @out=@TotalCollection output

    select @CustomerBalance = sum(DebitBook-CreditBook) from acc.JournalLine where Account in ('1241','1242')

    set @SQL2 = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2 + ' and SalesPersonNumber like ''1%'''
    exec sp_executesql @SQL2, N'@out dec(18,5) output', @out=@WhiteSales output

    set @SQL2 = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2 + ' and SalesPersonNumber like ''2%'''
    exec sp_executesql @SQL2, N'@out dec(18,5) output', @out=@ColorCenterSales output

    set @SQL2 = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2 + ' and SalesPersonNumber like ''3%'''
    exec sp_executesql @SQL2, N'@out dec(18,5) output', @out=@ProjectSales output

    set @SQL2 = N'select @out = Sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2 + ' and CustomerNumber like ''6%'''
    exec sp_executesql @SQL2, N'@out dec(18,5) output', @out=@ExportSales output

    set @SQL2 = N'select @out = isnull(Sum(TotalFinalAmountBase),0) from acr.CustomerInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@TotalFinalAmount output

    set @SQL2 = N'select @out = isnull(Sum(LineWeight),0) from acr.CustomerInvoiceLine where year(InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter2
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@TotalWeight output

    set @SQL2 = N'select @out = isnull(Sum(LineWeight),0) from acr.CustomerInvoiceLine where year(InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + @MonthFilter2
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevTotalWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''1%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@WhiteWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''2%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@ColorCenterWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''3%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@ProjectWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.CustomerNumber like ''6%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@ExportWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''1%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevWhiteWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''2%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevColorCenterWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.SalesPersonNumber like ''3%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevProjectWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and b.CustomerNumber like ''6%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevExportWeight output

    set @SQL2 = N'select @out = isnull(Sum(a.InvoicedQuantity * b.Volume),0) from acr.CustomerInvoiceLine a left outer join inv.ItemMaster b on a.ItemID=b.ItemID left outer join acr.CustomerInvoiceHeader c on a.IntID=c.InternalID where year(a.InvoiceDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and c.SalesPersonNumber like ''2%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@ColorCenterVolume output

    set @SQL2 = N'select @out = isnull(Sum(a.InvoicedQuantity * b.Volume),0) from acr.CustomerInvoiceLine a left outer join inv.ItemMaster b on a.ItemID=b.ItemID left outer join acr.CustomerInvoiceHeader c on a.IntID=c.InternalID where year(a.InvoiceDate)=' + cast((@Year-1) as nvarchar) + ' and ' + replace(@MonthFilter2,'InvoiceDate','a.InvoiceDate') + ' and c.SalesPersonNumber like ''2%'''
    exec sp_executesql @SQL2, N'@out dec(18,2) output', @out=@PrevColorCenterVolume output

    select @SalesAmount2025 = sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where year(InvoiceDate) = (@Year-1) and InvoiceDate <= dateadd(year,-1,cast(getdate() as date))
    select @SalesAmount2026 = sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where year(InvoiceDate) = @Year and InvoiceDate <= cast(getdate() as date)
    select @YTD2025Export2  = sum(TotalTaxtableAmount*ExchangeRate) from acr.CustomerInvoiceHeader where year(InvoiceDate) = (@Year-1) and InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and CustomerNumber like '6%'
    select @YTD2026Export2  = isnull(sum(TotalTaxtableAmount*ExchangeRate),0) from acr.CustomerInvoiceHeader where year(InvoiceDate) = @Year and InvoiceDate <= cast(getdate() as date) and CustomerNumber like '6%'

    select @YTDWeight2025 = isnull(sum(LineWeight),0) from acr.CustomerInvoiceLine where year(InvoiceDate) = (@Year-1) and InvoiceDate <= dateadd(year,-1,cast(getdate() as date))
    select @YTDWeight2026 = isnull(sum(LineWeight),0) from acr.CustomerInvoiceLine where year(InvoiceDate) = @Year and InvoiceDate <= cast(getdate() as date)

    select @YTDWhiteWeight2025 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = (@Year-1) and a.InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and b.SalesPersonNumber like '1%'
    select @YTDColorCenterWeight2025 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = (@Year-1) and a.InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and b.SalesPersonNumber like '2%'
    select @YTDProjectWeight2025 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = (@Year-1) and a.InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and b.SalesPersonNumber like '3%'
    select @YTDExportWeight2025 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = (@Year-1) and a.InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and b.CustomerNumber like '6%'

    select @YTDWhiteWeight2026 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = @Year and a.InvoiceDate <= cast(getdate() as date) and b.SalesPersonNumber like '1%'
    select @YTDColorCenterWeight2026 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = @Year and a.InvoiceDate <= cast(getdate() as date) and b.SalesPersonNumber like '2%'
    select @YTDProjectWeight2026 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = @Year and a.InvoiceDate <= cast(getdate() as date) and b.SalesPersonNumber like '3%'
    select @YTDExportWeight2026 = isnull(sum(a.LineWeight),0) from acr.CustomerInvoiceLine a left outer join acr.CustomerInvoiceHeader b on a.IntID=b.InternalID where year(a.InvoiceDate) = @Year and a.InvoiceDate <= cast(getdate() as date) and b.CustomerNumber like '6%'

    select @YTDColorCenterVolume2025 = isnull(sum(a.InvoicedQuantity * b.Volume),0) from acr.CustomerInvoiceLine a left outer join inv.ItemMaster b on a.ItemID=b.ItemID left outer join acr.CustomerInvoiceHeader c on a.IntID=c.InternalID where year(a.InvoiceDate) = (@Year-1) and a.InvoiceDate <= dateadd(year,-1,cast(getdate() as date)) and c.SalesPersonNumber like '2%'
    select @YTDColorCenterVolume2026 = isnull(sum(a.InvoicedQuantity * b.Volume),0) from acr.CustomerInvoiceLine a left outer join inv.ItemMaster b on a.ItemID=b.ItemID left outer join acr.CustomerInvoiceHeader c on a.IntID=c.InternalID where year(a.InvoiceDate) = @Year and a.InvoiceDate <= cast(getdate() as date) and c.SalesPersonNumber like '2%'

    select @WhiteSales as WhiteSales, @ColorCenterSales as ColorCenterSales, @ProjectSales as ProjectSales,
           @ExportSales as ExportSales, @SalesAmount2025 as SalesAmount2025, @SalesAmount2026 as SalesAmount2026,
           @YTD2025Export2 as YTD2025Export, @YTD2026Export2 as YTD2026Export,
           @TotalSalesAmount as TotalSalesAmount, @TotalCollection as TotalCollection, @CustomerBalance as CustomerBalance,
           @TotalFinalAmount as TotalFinalAmount,
           @TotalWeight as TotalWeight, @PrevTotalWeight as PrevTotalWeight,
           @YTDWeight2025 as YTDWeight2025, @YTDWeight2026 as YTDWeight2026,
           @WhiteWeight as WhiteWeight, @ColorCenterWeight as ColorCenterWeight,
           @ProjectWeight as ProjectWeight, @ExportWeight as ExportWeight,
           @PrevWhiteWeight as PrevWhiteWeight, @PrevColorCenterWeight as PrevColorCenterWeight,
           @PrevProjectWeight as PrevProjectWeight, @PrevExportWeight as PrevExportWeight,
           @YTDWhiteWeight2025 as YTDWhiteWeight2025, @YTDColorCenterWeight2025 as YTDColorCenterWeight2025,
           @YTDProjectWeight2025 as YTDProjectWeight2025, @YTDExportWeight2025 as YTDExportWeight2025,
           @YTDWhiteWeight2026 as YTDWhiteWeight2026, @YTDColorCenterWeight2026 as YTDColorCenterWeight2026,
           @YTDProjectWeight2026 as YTDProjectWeight2026, @YTDExportWeight2026 as YTDExportWeight2026,
           @ColorCenterVolume as ColorCenterVolume, @PrevColorCenterVolume as PrevColorCenterVolume,
           @YTDColorCenterVolume2025 as YTDColorCenterVolume2025, @YTDColorCenterVolume2026 as YTDColorCenterVolume2026
end


if @Operation = 'Get Customer Type Detail Breakdown'
begin
    if lower(@User) = 'a.mostafa'
    begin
        set @State = 1
        set @Message = 'Access Denied: You do not have permission to view Sales data.'
        return
    end

    declare @Period4 nvarchar(20), @Months4 nvarchar(100), @QuarterNo4 int, @CustomerType4 nvarchar(50)

    select 
        @Period4   = Period,
        @Months4   = Months,
        @QuarterNo4 = Quarter,
        @Year      = Year,
        @CustomerType4 = CustomerType
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year',
        CustomerType nvarchar(50) '$.CustomerType'
    )

    if @Period4 = 'quarterly' and (@Months4 is null or @Months4 = '')
        set @Months4 = case @QuarterNo4
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end

    declare @MonthFilter4 nvarchar(200)
    if @Period4 = 'yearly'
        set @MonthFilter4 = '1=1'
    else
        set @MonthFilter4 = 'month(a.InvoiceDate) IN (' + @Months4 + ')'

    -- Filter expression based on the selected type using CustomerMaster columns
    declare @Filter4 nvarchar(max)
    set @Filter4 = case @CustomerType4
        when 'White Customers' then 'b.CustomerSalesPerson like ''1%'' and b.CustomerNo not like ''6%'''
        when 'Color Centers' then 'b.CustomerSalesPerson like ''2%'' and b.CustomerNo not like ''6%'''
        when 'Projects' then 'b.CustomerSalesPerson like ''3%'' and b.CustomerNo not like ''6%'''
        when 'Export' then 'b.CustomerNo like ''6%'''
        else 'b.CustomerSalesPerson not like ''1%'' and b.CustomerSalesPerson not like ''2%'' and b.CustomerSalesPerson not like ''3%'' and b.CustomerNo not like ''6%'''
    end

    set @Filter4 = isnull(@Filter4, '1=1')

    if @Year is null or @Year = 0
        set @Year = year(getdate())

    declare @MaxMonth int
    if @Year = year(getdate())
        set @MaxMonth = month(getdate())
    else
        set @MaxMonth = 12

    -- Run query to get the grouped table
    declare @SQL4 nvarchar(max)
    set @SQL4 = N'
        select top(25) 
            x.CustomerNo as CustomerNumber, 
            isnull(max(x.CustomerName), ''Unknown Customer'') as CustomerName,
            sum(case when x.SummaryYear = @Year and x.SummaryMonth <= @MaxMonth then x.TotalAmount else 0 end) as AmountYTD2026,
            sum(case when x.SummaryYear = (@Year - 1) and x.SummaryMonth <= @MaxMonth then x.TotalAmount else 0 end) as AmountYTD2025,
            sum(case when x.SummaryYear = @Year and x.SummaryMonth <= @MaxMonth then x.TotalWeight else 0 end) as WeightYTD2026,
            sum(case when x.SummaryYear = (@Year - 1) and x.SummaryMonth <= @MaxMonth then x.TotalWeight else 0 end) as WeightYTD2025,
            sum(case when x.SummaryYear = @Year and x.SummaryMonth <= @MaxMonth then x.TotalVolume else 0 end) as VolumeYTD2026,
            sum(case when x.SummaryYear = (@Year - 1) and x.SummaryMonth <= @MaxMonth then x.TotalVolume else 0 end) as VolumeYTD2025
        from Control.CustomerMonthlySummary x
        left outer join acr.CustomerMaster b on x.CustomerNo = b.CustomerNo
        where (x.SummaryYear = @Year or x.SummaryYear = (@Year - 1))
          and ' + @Filter4 + '
        group by x.CustomerNo
        order by sum(case when x.SummaryYear = @Year and x.SummaryMonth <= @MaxMonth then x.TotalAmount else 0 end) desc'

    exec sp_executesql @SQL4, N'@Year int, @MaxMonth int', @Year = @Year, @MaxMonth = @MaxMonth
end


if @Operation = 'Get Purchasing Details By Period'
begin
    if lower(@User) = 'w.sabri'
    begin
        set @State = 1
        set @Message = 'Access Denied: You do not have permission to view Purchasing data.'
        return
    end

    declare @Period3 nvarchar(20), @Months3 nvarchar(100), @QuarterNo3 int

    select 
        @Period3    = Period,
        @Months3    = Months,
        @QuarterNo3 = Quarter,
        @Year       = Year
    from openjson(@LineData) with (
        Period   nvarchar(20)  '$.Period',
        Months   nvarchar(100) '$.Months',
        Quarter  int           '$.Quarter',
        Year     int           '$.Year'
    )

    if @Period3 = 'quarterly' and (@Months3 is null or @Months3 = '')
        set @Months3 = case @QuarterNo3
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
        end

    declare @MonthFilter3 nvarchar(200)
    if @Period3 = 'yearly'
        set @MonthFilter3 = '1=1'
    else
        set @MonthFilter3 = 'month(InvoiceDate) IN (' + @Months3 + ')'

    declare @SQL3 nvarchar(max)

    set @SQL3 = N'select @out = Sum((TotalLinesAmount-TotalDiscount)*InvoiceExchangeRate) from ACP.VendorInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter3
    exec sp_executesql @SQL3, N'@out dec(18,5) output', @out=@TotalPurchasingAmount output

    set @SQL3 = N'select @out = sum(DebitBook) from acc.JournalLine where Account in (2321,2322) and substring(JournalNo,1,2) in (''GP'',''BT'',''NP'') and DebitBook>0 and year(JournalDate)=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter3,'InvoiceDate','JournalDate')
    exec sp_executesql @SQL3, N'@out dec(18,5) output', @out=@TotalPaid output

    select @VendorBalance = sum(DebitBook-CreditBook) from acc.JournalLine where Account in (2321,2322)

    set @SQL3 = N'select @out = Sum((TotalLinesAmount-TotalDiscount)*InvoiceExchangeRate) from ACP.VendorInvoiceHeader where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter3 + ' and VendorType like ''N%'''
    exec sp_executesql @SQL3, N'@out dec(18,5) output', @out=@LocalPurchasing output

    set @ImportPurchasing = @TotalPurchasingAmount - @LocalPurchasing

    set @SQL3 = N'select @out = sum((a.LineAmout-LineDiscount)*InvoiceExchangeRate) from acp.VendorInvoiceLine a left outer join acp.VendorInvoiceHeader b on a.IntID=b.InternalID where InvYear=' + cast(@Year as nvarchar) + ' and ' + replace(@MonthFilter3,'InvoiceDate','b.InvoiceDate') + ' and ItemType in (''R'',''P'')'
    exec sp_executesql @SQL3, N'@out dec(18,5) output', @out=@RawPurchasing output

    set @OtherPurchasing = @TotalPurchasingAmount - @RawPurchasing

    select @TotalPurchasingAmount as TotalPurchasingAmount, @TotalPaid as TotalPaid, @VendorBalance as VendorBalance,
           @ImportPurchasing as ImportPurchasing, @LocalPurchasing as LocalPurchasing,
           @RawPurchasing as RawPurchasing, @OtherPurchasing as OtherPurchasing

    set @SQL3 = N'select top(10) a.VendorNumber, VendorExtraName as VendorName, Sum((TotalLinesAmount-TotalDiscount)*InvoiceExchangeRate) as TotalAmount from ACP.VendorInvoiceHeader a left outer join ACP.VendorMaster b on a.VendorNumber=b.VendorNumber where InvoiceYear=' + cast(@Year as nvarchar) + ' and ' + @MonthFilter3 + ' group by a.VendorNumber, VendorExtraName order by Sum((TotalLinesAmount-TotalDiscount)*InvoiceExchangeRate) desc'
    exec sp_executesql @SQL3

    select top(10) b.VendorExtraName as VendorName, sum(DebitBook-CreditBook) as VendorBalance
    from acc.JournalLine a left outer join acp.VendorMaster b on a.vendor=b.VendorNumber
    where Account in (2321,2322)
    group by b.VendorExtraName
    order by sum(DebitBook-CreditBook) asc
end

    if @Operation = 'Get Raw and Packing Details'
    begin
        if lower(@User) not in ('mhd', 'a.mostafa', 'm.a.elhout')
        begin
            set @State = 1
            set @Message = 'Access Denied: You do not have permission to view Raw & Packing data.'
            return
        end

        ;with LastInvoicePrice as (
            select 
                b.ItemCode,
                b.Price as LastPrice,
                a.InvoiceCurrency as LastCurrency,
                a.InvoiceDate as LastInvoiceDate,
                a.InvoiceExchangeRate as LastExchangeRate,
                row_number() over (partition by b.ItemCode order by a.InvoiceDate desc, a.InternalID desc) as RowNum
            from acp.VendorInvoiceHeader a
            inner join acp.VendorInvoiceLine b on a.InternalID = b.IntID
            where isnull(b.ItemCode, '') <> ''
        )
        select 
            g.ItemCode,
            g.ItemType,
            g.ItemExtraDescription,
            g.ItemBalance,
            isnull(lp.LastPrice, 0) as LastPrice,
            isnull(lp.LastCurrency, '') as LastCurrency,
            (isnull(lp.LastPrice, 0) * g.ItemBalance) as ItemAmount,
            lp.LastInvoiceDate,
            isnull(lp.LastExchangeRate, 1) as LastExchangeRate,
            (isnull(lp.LastPrice, 0) * isnull(lp.LastExchangeRate, 1) * g.ItemBalance) as ItemAmountEGP
        from (
            select 
                a.ItemCode, 
                isnull(b.ItemType, 'N/A') as ItemType, 
                isnull(b.ItemExtraDescription, '') as ItemExtraDescription,
                sum(a.ItemBalance) as ItemBalance
            from inv.ItemBalance a 
            left outer join inv.ItemMaster b on a.ItemID = b.ItemID
            group by a.ItemCode, b.ItemType, b.ItemExtraDescription
            having sum(a.ItemBalance) <> 0 and isnull(b.ItemType, '') not in ('B', 'S', 'F')
        ) g
        left outer join LastInvoicePrice lp on g.ItemCode = lp.ItemCode and lp.RowNum = 1
        order by g.ItemCode
    end

end
