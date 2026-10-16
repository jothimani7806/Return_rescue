from decimal import Decimal
from .models import (
    RecoveryOutcome,
    VisualConditionChoice,
    PackagingCondition
)

class CategoryAwareRecoveryEngine:
    """
    Transparent, configurable category-aware decision engine that separates visual condition
    analysis from product recovery routing.
    
    Evaluates:
    - Product Category & Subcategory specific rules
    - Visual condition & AI confidence
    - Functional status & customer statement
    - Packaging condition & missing accessories
    - Category-specific safety risks (batteries, hygiene, structural)
    - Repair economics (repair cost vs retail price)
    - Resale eligibility
    """

    @classmethod
    def evaluate(cls, return_request, ai_inspection=None):
        category = return_request.category
        product = return_request.product
        retail_price = product.retail_price if product else Decimal('80.00')
        resale_eligible = product.resale_eligible if product else True
        is_hygiene_sensitive = product.is_hygiene_sensitive if product else (
            category.slug in ['beauty-and-personal-care-products', 'baby-products']
        )
        is_safety_critical = product.is_safety_critical if product else (
            category.slug in ['home-appliances', 'tools-and-hardware', 'automotive-accessories']
        )

        # Retrieve inspection rule if exists
        rule = getattr(category, 'inspection_rule', None)
        max_repair_ratio = rule.max_repair_cost_ratio if rule else 0.45
        auto_recycle_if_unsafe = rule.auto_recycle_if_unsafe if rule else True

        # Extract AI condition
        visual_condition = ai_inspection.overall_condition if ai_inspection else VisualConditionChoice.UNCERTAIN_OR_UNSUPPORTED
        ai_confidence = ai_inspection.confidence_score if ai_inspection else 0.5
        is_supported = ai_inspection.is_category_supported if ai_inspection else False

        # Gather inputs from return request
        is_functional = return_request.is_functional
        packaging = return_request.packaging_condition
        missing_acc = return_request.missing_accessories or []
        condition_answers = return_request.condition_answers or {}

        rules_applied = []
        safety_alerts = []
        rationale_points = []

        # 1. Safety Assessment
        # Check for safety hazards in answers or defects
        safety_issues = []
        for key, val in condition_answers.items():
            if 'safety' in key.lower() or 'hazard' in key.lower():
                if val is True or str(val).lower() in ['yes', 'true', 'detected', 'hazard']:
                    safety_issues.append(key)
        
        # Check visual condition safety triggers
        if visual_condition == VisualConditionChoice.WATER_DAMAGE and is_safety_critical:
            safety_issues.append("Water damage on electrical / safety-critical equipment")
        
        if is_hygiene_sensitive and packaging != PackagingCondition.ORIGINAL_SEALED:
            # Check hygiene seal
            if condition_answers.get('hygiene_seal_intact') is False:
                safety_issues.append("Hygiene safety seal broken or contaminated")

        # 2. Repair cost estimation
        estimated_repair_cost = Decimal('0.00')
        if visual_condition in [
            VisualConditionChoice.CRACK_OR_BREAK,
            VisualConditionChoice.TEAR_OR_RIP,
            VisualConditionChoice.MISSING_OR_BROKEN_PART,
            VisualConditionChoice.DEFORMATION
        ]:
            if category.slug in ['clothing-and-apparel', 'bags-and-accessories']:
                estimated_repair_cost = Decimal('15.00')
            elif category.slug in ['smartphones-and-electronics', 'computers-laptops-and-peripherals']:
                estimated_repair_cost = (retail_price * Decimal('0.35')).quantize(Decimal('0.01'))
            elif category.slug in ['footwear']:
                estimated_repair_cost = Decimal('22.00')
            else:
                estimated_repair_cost = (retail_price * Decimal('0.25')).quantize(Decimal('0.01'))
        elif not is_functional:
            estimated_repair_cost = (retail_price * Decimal('0.30')).quantize(Decimal('0.01'))

        # Estimated resale value (if routed to resale)
        if visual_condition == VisualConditionChoice.GOOD_OR_NO_VISIBLE_DAMAGE:
            estimated_resale_value = (retail_price * Decimal('0.85')).quantize(Decimal('0.01'))
        elif visual_condition == VisualConditionChoice.SCRATCH_OR_SCUFF:
            estimated_resale_value = (retail_price * Decimal('0.70')).quantize(Decimal('0.01'))
        else:
            estimated_resale_value = (retail_price * Decimal('0.50')).quantize(Decimal('0.01'))

        # 3. Decision Logic
        outcome = RecoveryOutcome.RESALE
        confidence = 0.85

        # RULE 1: Unsafe product -> RECYCLING
        if safety_issues and auto_recycle_if_unsafe:
            outcome = RecoveryOutcome.RECYCLING
            safety_alerts.append(f"CRITICAL SAFETY CONCERN: {', '.join(safety_issues)}")
            rationale_points.append(
                f"Product failed safety evaluation ({', '.join(safety_issues)}). Routed directly to certified recycling to prevent hazardous reuse."
            )
            rules_applied.append("RULE_CRITICAL_SAFETY_FAIL")
            confidence = 0.98

        # RULE 2: RESTOCK eligibility
        elif (
            visual_condition == VisualConditionChoice.GOOD_OR_NO_VISIBLE_DAMAGE
            and is_functional is True
            and packaging in [PackagingCondition.ORIGINAL_SEALED, PackagingCondition.ORIGINAL_OPENED]
            and len(missing_acc) == 0
            and not (is_hygiene_sensitive and packaging != PackagingCondition.ORIGINAL_SEALED)
        ):
            outcome = RecoveryOutcome.RESTOCK
            rationale_points.append("Item is complete, safe, and fully functional with no visible cosmetic damage.")
            if packaging == PackagingCondition.ORIGINAL_SEALED:
                rationale_points.append("Original factory seal intact. Qualifies for immediate restock into prime inventory.")
            else:
                rationale_points.append("Packaging opened but intact with all accessories present.")
            rules_applied.append("RULE_PRIME_RESTOCK_QUALIFIED")
            confidence = 0.92

        # RULE 3: REPAIR eligibility
        elif (
            (visual_condition in [
                VisualConditionChoice.CRACK_OR_BREAK,
                VisualConditionChoice.TEAR_OR_RIP,
                VisualConditionChoice.MISSING_OR_BROKEN_PART,
                VisualConditionChoice.DEFORMATION
            ] or not is_functional)
            and not is_hygiene_sensitive  # Hygiene items usually not repaired
        ):
            repair_ratio = float(estimated_repair_cost / retail_price) if retail_price > 0 else 1.0
            if repair_ratio <= max_repair_ratio:
                outcome = RecoveryOutcome.REPAIR
                rationale_points.append(
                    f"Item has repairable defect ({visual_condition.label if hasattr(visual_condition, 'label') else visual_condition})."
                )
                rationale_points.append(
                    f"Estimated repair cost (${estimated_repair_cost:.2f}) is {repair_ratio*100:.1f}% of retail price (${retail_price:.2f}), below max threshold of {max_repair_ratio*100:.0f}%."
                )
                rules_applied.append("RULE_REPAIR_FEASIBLE_ECONOMIC")
                confidence = 0.88
            else:
                # Uneconomical repair -> RECYCLING
                outcome = RecoveryOutcome.RECYCLING
                rationale_points.append(
                    f"Repair cost (${estimated_repair_cost:.2f}) exceeds economic threshold ({repair_ratio*100:.1f}% > {max_repair_ratio*100:.0f}% of retail price)."
                )
                rationale_points.append("Routed to certified recycling for responsible material recovery.")
                rules_applied.append("RULE_REPAIR_UNECONOMICAL_RECYCLE")
                confidence = 0.90

        # RULE 4: Hygiene Sensitive Items Opened / Used -> RECYCLING
        elif is_hygiene_sensitive and packaging != PackagingCondition.ORIGINAL_SEALED:
            outcome = RecoveryOutcome.RECYCLING
            rationale_points.append(
                f"Category '{category.name}' is hygiene-sensitive. Unsealed items cannot be restocked or resold under sanitary policy."
            )
            rules_applied.append("RULE_HYGIENE_UNSEALED_RECYCLE")
            confidence = 0.95

        # RULE 5: RESALE eligibility (Minor cosmetic wear, missing secondary packaging/accessories)
        elif resale_eligible and is_functional:
            outcome = RecoveryOutcome.RESALE
            rationale_points.append("Item is functional and safe to use.")
            if visual_condition == VisualConditionChoice.SCRATCH_OR_SCUFF:
                rationale_points.append("Minor cosmetic scuffs or scratches present, suitable for discounted secondary resale.")
            elif packaging in [PackagingCondition.DAMAGED_BOX, PackagingCondition.NO_PACKAGING]:
                rationale_points.append("Packaging damaged or missing, but core product functions properly.")
            if missing_acc:
                rationale_points.append(f"Missing minor accessories: {', '.join(missing_acc)}. Eligible for clearance / outlet resale.")
            rules_applied.append("RULE_SECONDARY_RESALE_ROUTED")
            confidence = 0.86

        # FALLBACK: Needs manager review
        else:
            outcome = RecoveryOutcome.RECYCLING if not is_functional else RecoveryOutcome.RESALE
            rationale_points.append("Complex condition requiring manager confirmation.")
            rules_applied.append("RULE_DEFAULT_FALLBACK")
            confidence = 0.65

        # If visual inspection was low confidence or unsupported
        if not is_supported or ai_confidence < 0.60:
            rationale_points.append(
                "NOTE: Vision model has experimental or low confidence for this category. Manager manual verification is required."
            )

        return {
            'recommended_action': outcome,
            'confidence': float(confidence),
            'rationale': "\n".join(rationale_points),
            'estimated_repair_cost': estimated_repair_cost,
            'estimated_resale_value': estimated_resale_value,
            'safety_alert': " ".join(safety_alerts),
            'rules_applied': rules_applied,
        }
