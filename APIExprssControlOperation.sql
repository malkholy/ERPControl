USE [Express]
GO
/****** Object:  StoredProcedure [dbo].[APIExprssControlOperation]    Script Date: 6/23/2026 1:08:59 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
ALTER   procedure [dbo].[APIExprssControlOperation]
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
    @State          int            output,
    @Message        nvarchar(500)  output
WITH EXECUTE AS OWNER
as
begin
    set nocount on;
    set @State = 0;
    set @Message = '';

    -- Redemptions are queried from the pre-populated physical table [Stas].[RedemptionHistory]

    -- Parse standard parameters from @LineData if provided
    declare @Period nvarchar(20), @Months nvarchar(100), @QuarterNo int
    declare @SelectedYear int

    if @LineData is not null and @LineData <> '' and isjson(@LineData) > 0
    begin
        select 
            @Period      = Period,
            @Months      = Months,
            @QuarterNo   = Quarter,
            @SelectedYear = Year
        from openjson(@LineData) with (
            Period   nvarchar(20)  '$.Period',
            Months   nvarchar(100) '$.Months',
            Quarter  int           '$.Quarter',
            Year     int           '$.Year'
        )
    end

    -- Fallbacks
    if @SelectedYear is null or @SelectedYear = 0
        set @SelectedYear = @Year;
    if @SelectedYear = 0
        set @SelectedYear = year(getdate());

    if @Period is null
        set @Period = 'monthly';

    if @Months is null and @Month <> 0
        set @Months = cast(@Month as nvarchar);
    if @Months is null
        set @Months = cast(month(getdate()) as nvarchar);

    -- Expand quarters
    if @Period = 'quarterly' and @QuarterNo is not null and (@Months is null or @Months = '')
    begin
        set @Months = case @QuarterNo
            when 1 then '1,2,3'
            when 2 then '4,5,6'
            when 3 then '7,8,9'
            when 4 then '10,11,12'
            else @Months
        end
    end

    -- Populate temporary table of months for filtering
    declare @MonthTable table (MonthVal int)
    if @Period <> 'yearly' and @Months is not null and @Months <> ''
    begin
        insert into @MonthTable
        select cast(value as int) from string_split(@Months, ',')
    end

    -- =========================================================================
    -- 1. Get Control Data By Period (For parent page summary cards)
    -- =========================================================================
    if @Operation = 'Get Control Data By Period'
    begin
        declare @TotalChargingCards int = 0
        declare @TotalChargingPoints dec(18,2) = 0
        declare @TotalActiveCards int = 0
        declare @TotalActivePoints dec(18,2) = 0

        select 
            @TotalChargingCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @TotalChargingPoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear

        select 
            @TotalActiveCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @TotalActivePoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointActivationHistory]
        where ActivationYear = @SelectedYear

        select 
            @TotalChargingCards as TotalChargingCards,
            @TotalChargingPoints as TotalChargingPoints,
            @TotalActiveCards as TotalActiveCards,
            @TotalActivePoints as TotalActivePoints

        return
    end

    -- =========================================================================
    -- 2. Get Express Details By Period (Full dashboard content)
    -- =========================================================================
    if @Operation = 'Get Express Details By Period'
    begin
        -- Current Year
        declare @CY_ChargingCards int = 0, @CY_ChargingPoints dec(18,2) = 0
        declare @CY_ActiveCards int = 0, @CY_ActivePoints dec(18,2) = 0
        declare @CY_RedeemRequests int = 0, @CY_RedeemPoints dec(18,2) = 0, @CY_RedeemAmount dec(18,2) = 0

        -- Prior Year
        declare @PY_ChargingCards int = 0, @PY_ChargingPoints dec(18,2) = 0
        declare @PY_ActiveCards int = 0, @PY_ActivePoints dec(18,2) = 0
        declare @PY_RedeemRequests int = 0, @PY_RedeemPoints dec(18,2) = 0, @PY_RedeemAmount dec(18,2) = 0

        -- Query CY Charging
        select 
            @CY_ChargingCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @CY_ChargingPoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear

        -- Query PY Charging
        select 
            @PY_ChargingCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @PY_ChargingPoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear - 1

        -- Query CY Activation
        select 
            @CY_ActiveCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @CY_ActivePoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointActivationHistory]
        where ActivationYear = @SelectedYear

        -- Query PY Activation
        select 
            @PY_ActiveCards = isnull(sum(cast(TotalCards as bigint)), 0),
            @PY_ActivePoints = isnull(sum(cast(TotalPoints as dec(18,2))), 0)
        from [Express].[Stas].[PointActivationHistory]
        where ActivationYear = @SelectedYear - 1

        -- Query CY Redemptions
        select 
            @CY_RedeemRequests = isnull(count(1), 0),
            @CY_RedeemPoints = isnull(sum(GiftPoint), 0),
            @CY_RedeemAmount = isnull(sum(OfferValue), 0)
        from [Express].[Stas].[RedemptionHistory]
        where RedemptionYear = @SelectedYear

        -- Query PY Redemptions
        select 
            @PY_RedeemRequests = isnull(count(1), 0),
            @PY_RedeemPoints = isnull(sum(GiftPoint), 0),
            @PY_RedeemAmount = isnull(sum(OfferValue), 0)
        from [Express].[Stas].[RedemptionHistory]
        where RedemptionYear = @SelectedYear - 1

        -- Query whole-year totals (for Activation vs Charging YoY KPI)
        declare @CY_YearChargingCards int = 0, @CY_YearActiveCards int = 0
        declare @PY_YearChargingCards int = 0, @PY_YearActiveCards int = 0
        declare @CY_ActiveClients int = 0
        declare @PY_ActiveClients int = 0

        select @CY_YearChargingCards = isnull(sum(cast(TotalCards as bigint)), 0)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear

        select @CY_YearActiveCards = isnull(sum(cast(TotalCards as bigint)), 0)
        from [Express].[Stas].[PointActivationHistory]
        where ActivationYear = @SelectedYear

        select @PY_YearChargingCards = isnull(sum(cast(TotalCards as bigint)), 0)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear - 1

        select @PY_YearActiveCards = isnull(sum(cast(TotalCards as bigint)), 0)
        from [Express].[Stas].[PointActivationHistory]
        where ActivationYear = @SelectedYear - 1

        -- Query active clients in charging table
        select @CY_ActiveClients = count(distinct ClientID)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear

        select @PY_ActiveClients = count(distinct ClientID)
        from [Express].[Stas].[PointChargingHistory]
        where ChargingYear = @SelectedYear - 1

        -- List0: Summary totals (CY vs PY)
        select 
            @CY_ChargingCards as CY_ChargingCards,
            @CY_ChargingPoints as CY_ChargingPoints,
            @CY_ActiveCards as CY_ActiveCards,
            @CY_ActivePoints as CY_ActivePoints,
            @CY_RedeemRequests as CY_RedeemRequests,
            @CY_RedeemPoints as CY_RedeemPoints,
            @CY_RedeemAmount as CY_RedeemAmount,
            @PY_ChargingCards as PY_ChargingCards,
            @PY_ChargingPoints as PY_ChargingPoints,
            @PY_ActiveCards as PY_ActiveCards,
            @PY_ActivePoints as PY_ActivePoints,
            @PY_RedeemRequests as PY_RedeemRequests,
            @PY_RedeemPoints as PY_RedeemPoints,
            @PY_RedeemAmount as PY_RedeemAmount,
            @CY_YearChargingCards as CY_YearChargingCards,
            @CY_YearActiveCards as CY_YearActiveCards,
            @PY_YearChargingCards as PY_YearChargingCards,
            @PY_YearActiveCards as PY_YearActiveCards,
            @CY_ActiveClients as CY_ActiveClients,
            @PY_ActiveClients as PY_ActiveClients

        -- List1: Monthly YoY compare trend
        select 
            m.MonthVal as [Month],
            isnull(c.CY_ChargingCards, 0) as CY_ChargingCards,
            isnull(c.CY_ChargingPoints, 0) as CY_ChargingPoints,
            isnull(p.PY_ChargingCards, 0) as PY_ChargingCards,
            isnull(p.PY_ChargingPoints, 0) as PY_ChargingPoints,
            isnull(a.CY_ActiveCards, 0) as CY_ActiveCards,
            isnull(a.CY_ActivePoints, 0) as CY_ActivePoints,
            isnull(ap.PY_ActiveCards, 0) as PY_ActiveCards,
            isnull(ap.PY_ActivePoints, 0) as PY_ActivePoints,
            isnull(c.CY_ActiveClients, 0) as CY_ActiveClients,
            isnull(p.PY_ActiveClients, 0) as PY_ActiveClients,
            isnull(cj.CY_JoinedClients, 0) as CY_JoinedClients,
            isnull(pj.PY_JoinedClients, 0) as PY_JoinedClients
        from (
            select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all 
            select 5 union all select 6 union all select 7 union all select 8 union all 
            select 9 union all select 10 union all select 11 union all select 12
        ) m
        left join (
            select ChargingMonth, 
                   sum(cast(TotalCards as bigint)) as CY_ChargingCards, 
                   sum(cast(TotalPoints as dec(18,2))) as CY_ChargingPoints,
                   count(distinct ClientID) as CY_ActiveClients
            from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear
            group by ChargingMonth
        ) c on m.MonthVal = c.ChargingMonth
        left join (
            select ChargingMonth, 
                   sum(cast(TotalCards as bigint)) as PY_ChargingCards, 
                   sum(cast(TotalPoints as dec(18,2))) as PY_ChargingPoints,
                   count(distinct ClientID) as PY_ActiveClients
            from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear - 1
            group by ChargingMonth
        ) p on m.MonthVal = p.ChargingMonth
        left join (
            select ActivationMonth, sum(cast(TotalCards as bigint)) as CY_ActiveCards, sum(cast(TotalPoints as dec(18,2))) as CY_ActivePoints
            from [Express].[Stas].[PointActivationHistory]
            where ActivationYear = @SelectedYear
            group by ActivationMonth
        ) a on m.MonthVal = a.ActivationMonth
        left join (
            select ActivationMonth, sum(cast(TotalCards as bigint)) as PY_ActiveCards, sum(cast(TotalPoints as dec(18,2))) as PY_ActivePoints
            from [Express].[Stas].[PointActivationHistory]
            where ActivationYear = @SelectedYear - 1
            group by ActivationMonth
        ) ap on m.MonthVal = ap.ActivationMonth
        left join (
            select month(CreatedDate) as CreatedMonth, count(1) as CY_JoinedClients
            from [ClientMaster]
            where year(CreatedDate) = @SelectedYear
            group by month(CreatedDate)
        ) cj on m.MonthVal = cj.CreatedMonth
        left join (
            select month(CreatedDate) as CreatedMonth, count(1) as PY_JoinedClients
            from [ClientMaster]
            where year(CreatedDate) = @SelectedYear - 1
            group by month(CreatedDate)
        ) pj on m.MonthVal = pj.CreatedMonth
        where (@Period = 'yearly' or m.MonthVal in (select MonthVal from @MonthTable))
        order by m.MonthVal

        -- List2: Gift Redemption Leaderboard
        select top(25)
            0 as GiftID,
            GiftName,
            sum(OfferValue) as TotalGiftAmount,
            count(1) as TotalRequests,
            sum(GiftPoint) as TotalPoints
        from [Express].[Stas].[RedemptionHistory]
        where RedemptionYear = @SelectedYear
          and (@Period = 'yearly' or RedemptionMonth in (select MonthVal from @MonthTable))
        group by GiftName
        order by sum(GiftPoint) desc

        -- List3: Card Type Breakdown
        select 
            isnull(c.CardType, a.CardType) as CardType,
            isnull(c.TotalCardsCharged, 0) as TotalCardsCharged,
            isnull(c.TotalPointsCharged, 0) as TotalPointsCharged,
            isnull(a.TotalCardsActivated, 0) as TotalCardsActivated,
            isnull(a.TotalPointsActivated, 0) as TotalPointsActivated
        from (
            select CardType, sum(cast(TotalCards as bigint)) as TotalCardsCharged, sum(cast(TotalPoints as dec(18,2))) as TotalPointsCharged
            from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear
              and (@Period = 'yearly' or ChargingMonth in (select MonthVal from @MonthTable))
            group by CardType
        ) c
        full outer join (
            select CardType, sum(cast(TotalCards as bigint)) as TotalCardsActivated, sum(cast(TotalPoints as dec(18,2))) as TotalPointsActivated
            from [Express].[Stas].[PointActivationHistory]
            where ActivationYear = @SelectedYear
              and (@Period = 'yearly' or ActivationMonth in (select MonthVal from @MonthTable))
            group by CardType
        ) a on c.CardType = a.CardType
        order by isnull(c.TotalPointsCharged, 0) desc

        -- List4: Top Clients Leaderboard (Combining Charging and Redemption)
        ;with ClientList as (
            select ClientID from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear and (@Period = 'yearly' or ChargingMonth in (select MonthVal from @MonthTable))
            union
            select ClientID from [Express].[Stas].[RedemptionHistory]
            where RedemptionYear = @SelectedYear and (@Period = 'yearly' or RedemptionMonth in (select MonthVal from @MonthTable))
        )
        select top(25)
            cl.ClientID,
            isnull(m.Name, 'Client #' + cast(cl.ClientID as nvarchar)) as ClientName,
            isnull(chg.TotalChargedPoints, 0) as TotalChargedPoints,
            isnull(chg.TotalChargedCards, 0) as TotalChargedCards,
            isnull(red.TotalRedeemedPoints, 0) as TotalRedeemedPoints,
            isnull(red.TotalRedeemRequests, 0) as TotalRedeemRequests
        from ClientList cl
        left join [ClientMaster] m on m.GLCID = cl.ClientID
        left join (
            select ClientID, sum(cast(TotalPoints as dec(18,2))) as TotalChargedPoints, sum(cast(TotalCards as bigint)) as TotalChargedCards
            from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear
              and (@Period = 'yearly' or ChargingMonth in (select MonthVal from @MonthTable))
            group by ClientID
        ) chg on cl.ClientID = chg.ClientID
        left join (
            select ClientID, sum(GiftPoint) as TotalRedeemedPoints, count(1) as TotalRedeemRequests
            from [Express].[Stas].[RedemptionHistory]
            where RedemptionYear = @SelectedYear
              and (@Period = 'yearly' or RedemptionMonth in (select MonthVal from @MonthTable))
            group by ClientID
        ) red on cl.ClientID = red.ClientID
        order by isnull(chg.TotalChargedPoints, 0) desc

        -- List5: Governorate Statistics
        ;with ClientList as (
            select ClientID from [Express].[Stas].[PointChargingHistory]
            where ChargingYear = @SelectedYear and (@Period = 'yearly' or ChargingMonth in (select MonthVal from @MonthTable))
            union
            select ClientID from [Express].[Stas].[RedemptionHistory]
            where RedemptionYear = @SelectedYear and (@Period = 'yearly' or RedemptionMonth in (select MonthVal from @MonthTable))
        )
        select 
            isnull(gov.ArabicName, 'Other') as Governorate,
            count(distinct cl.ClientID) as TotalClients,
            sum(case when m.IsPainter = 1  then 1 else 0 end) as TotalPainters,
            sum(case when m.IsPainter = 0  then 1 else 0 end) as TotalNonPainters
        from ClientList cl
        left join [ClientMaster] m on m.GLCID = cl.ClientID
        left join [GovermentMaster] gov on m.GovermentID = gov.GovermentID
        group by gov.ArabicName
        order by count(distinct cl.ClientID) desc

        -- List6: Nova Voucher Redemptions
        select 
            m.MonthVal as [Month],
            isnull(r.TotalRequests, 0) as TotalRequests,
            isnull(r.TotalPoints, 0) as TotalPoints,
            isnull(r.TotalAmount, 0) as TotalAmount
        from (
            select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all 
            select 5 union all select 6 union all select 7 union all select 8 union all 
            select 9 union all select 10 union all select 11 union all select 12
        ) m
        left join (
            select 
                RedemptionMonth,
                count(1) as TotalRequests,
                sum(GiftPoint) as TotalPoints,
                sum(OfferValue) as TotalAmount
            from [Express].[Stas].[RedemptionHistory]
            where RedemptionYear = @SelectedYear
              and Source = 'NOVA'
            group by RedemptionMonth
        ) r on m.MonthVal = r.RedemptionMonth
        where (@Period = 'yearly' or m.MonthVal in (select MonthVal from @MonthTable))
        order by m.MonthVal

        -- List7: Cash Call Redemptions
        select 
            m.MonthVal as [Month],
            isnull(r.TotalRequests, 0) as TotalRequests,
            isnull(r.TotalPoints, 0) as TotalPoints,
            isnull(r.TotalAmount, 0) as TotalAmount
        from (
            select 1 as MonthVal union all select 2 union all select 3 union all select 4 union all 
            select 5 union all select 6 union all select 7 union all select 8 union all 
            select 9 union all select 10 union all select 11 union all select 12
        ) m
        left join (
            select 
                RedemptionMonth,
                count(1) as TotalRequests,
                sum(GiftPoint) as TotalPoints,
                sum(OfferValue) as TotalAmount
            from [Express].[Stas].[RedemptionHistory]
            where RedemptionYear = @SelectedYear
              and Source = 'CCALL'
            group by RedemptionMonth
        ) r on m.MonthVal = r.RedemptionMonth
        where (@Period = 'yearly' or m.MonthVal in (select MonthVal from @MonthTable))
        order by m.MonthVal

        return
    end

    -- =========================================================================
    -- 3. Get Express Client Detail (For slide-out drawer)
    -- =========================================================================
    if @Operation = 'Get Express Client Detail'
    begin
        declare @ClientID int

        if @LineData is not null and @LineData <> '' and isjson(@LineData) > 0
        begin
            select @ClientID = ClientID
            from openjson(@LineData) with (
                ClientID int '$.ClientID'
            )
        end

        -- List0: Client Charging History
        select 
            ChargingYear,
            ChargingMonth,
            CardType,
            TotalCards,
            TotalPoints
        from [Express].[Stas].[PointChargingHistory]
        where ClientID = @ClientID
        order by ChargingYear desc, ChargingMonth desc

        -- List1: Client Redemption History
        select 
            RedemptionYear,
            RedemptionMonth,
            GiftName,
            sum(OfferValue) as GiftAmount,
            count(1) as TotalRequest,
            sum(GiftPoint) as TotalPoint
        from [Express].[Stas].[RedemptionHistory]
        where ClientID = @ClientID
        group by RedemptionYear, RedemptionMonth, GiftName
        order by RedemptionYear desc, RedemptionMonth desc

        return
    end
end
