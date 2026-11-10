using UnityEngine;
using UnityEngine.Events;

namespace OfficePrankster.AI
{
    public enum BossMoodState
    {
        Calm,       // 0 - 29%
        Annoyed,    // 30 - 69%
        Furious,    // 70 - 99%
        Meltdown    // 100% (Bùng nổ Nộ khí - Berserk Mode)
    }

    /// <summary>
    /// Quản lý Thanh Nộ Khí (Rage Meter) và Trạng thái cảm xúc của Sếp.
    /// </summary>
    public class BossRageController : MonoBehaviour
    {
        [Header("=== Cấu hình Thanh Nộ Khí ===")]
        [Range(0f, 100f)]
        [SerializeField] private float currentRage = 0f;
        [SerializeField] private float naturalDecayRate = 1.2f;
        [SerializeField] private float cooldownBeforeDecay = 12f;
        [SerializeField] private float berserkDuration = 15f;

        [Header("=== Sự kiện ===")]
        public UnityEvent<float> OnRageChanged;
        public UnityEvent<BossMoodState> OnMoodStateChanged;
        public UnityEvent OnBossMeltdownJackpot;

        private float _lastPrankTime;
        private float _berserkTimer;
        private BossMoodState _currentMood = BossMoodState.Calm;

        public float CurrentRage => currentRage;
        public BossMoodState CurrentMood => _currentMood;

        private void Update()
        {
            if (_currentMood == BossMoodState.Meltdown)
            {
                _berserkTimer -= Time.deltaTime;
                if (_berserkTimer <= 0f)
                {
                    currentRage = 35f; // Hạ nhiệt sau cơn thịnh nộ
                    UpdateMoodState();
                }
                return;
            }

            // Hạ nhiệt tự nhiên nếu không bị chọc tức trong một khoảng thời gian
            if (Time.time - _lastPrankTime >= cooldownBeforeDecay && currentRage > 0f)
            {
                currentRage = Mathf.Max(0f, currentRage - naturalDecayRate * Time.deltaTime);
                UpdateMoodState();
                OnRageChanged?.Invoke(currentRage / 100f);
            }
        }

        /// <summary>
        /// Gọi hàm này khi Sếp dính bẫy. Trả về tổng điểm Prank nhận được theo hệ số Nộ khí.
        /// </summary>
        public int ApplyPrank(float baseRageAmount, int baseScore, int currentCombo)
        {
            _lastPrankTime = Time.time;

            // Công thức tính điểm thưởng: BaseScore * Combo * (1 + CurrentRage / 50)
            float rageScoreMultiplier = 1f + (currentRage / 50f);
            int awardedScore = Mathf.RoundToInt(baseScore * Mathf.Max(1, currentCombo) * rageScoreMultiplier);

            // Công thức tăng Nộ khí: BaseRage * (1 + 0.2 * Combo)
            float totalRageGain = baseRageAmount * (1f + 0.2f * Mathf.Max(0, currentCombo - 1));
            currentRage = Mathf.Clamp(currentRage + totalRageGain, 0f, 100f);

            OnRageChanged?.Invoke(currentRage / 100f);
            UpdateMoodState();

            if (currentRage >= 100f && _currentMood != BossMoodState.Meltdown)
            {
                _currentMood = BossMoodState.Meltdown;
                _berserkTimer = berserkDuration;
                OnMoodStateChanged?.Invoke(_currentMood);
                OnBossMeltdownJackpot?.Invoke();
                awardedScore += 800; // Jackpot Bonus
            }

            return awardedScore;
        }

        private void UpdateMoodState()
        {
            if (_currentMood == BossMoodState.Meltdown && _berserkTimer > 0f) return;

            BossMoodState nextMood;
            if (currentRage >= 70f) nextMood = BossMoodState.Furious;
            else if (currentRage >= 30f) nextMood = BossMoodState.Annoyed;
            else nextMood = BossMoodState.Calm;

            if (nextMood != _currentMood)
            {
                _currentMood = nextMood;
                OnMoodStateChanged?.Invoke(_currentMood);
            }
        }
    }
}
